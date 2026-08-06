package handlers

import (
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Batas dan jenis berkas yang diterima.
//
// Batas ukuran dipasang di dua tempat: MaxBytesReader membatasi berapa banyak
// byte yang benar-benar dibaca dari koneksi, dan pemeriksaan Size menolak lebih
// awal berdasarkan header multipart. Yang pertama adalah penjaga sungguhan —
// header bisa berbohong, pembaca tidak.
const (
	uploadMaxBytes = 5 << 20 // 5 MB
	uploadSniffLen = 512
)

// uploadAllowedTypes — pemetaan jenis terdeteksi ke ekstensi yang dipakai server.
//
// Ekstensi ditentukan dari jenis hasil pemeriksaan isi, bukan dari nama berkas
// yang dikirim klien. Nama asli dibuang seluruhnya, sehingga tidak ada jalan
// dari masukan pengguna menuju path berkas.
var uploadAllowedTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

// UploadHandler — penerimaan berkas gambar untuk foto produk.
//
// Berkas disimpan di direktori lokal dan disajikan kembali lewat rute statis.
// Penyimpanan objek (S3 dan sejenisnya) belum dipakai; bentuk response sengaja
// hanya berisi URL supaya pemindahan ke penyimpanan objek nanti tidak mengubah
// kontrak dengan klien.
type UploadHandler struct {
	baseDir string
}

func NewUploadHandler(baseDir string) *UploadHandler {
	if strings.TrimSpace(baseDir) == "" {
		baseDir = "./uploads"
	}
	return &UploadHandler{baseDir: baseDir}
}

// BaseDir — direktori tempat berkas ditulis, dipakai server saat mendaftarkan
// rute statis.
func (h *UploadHandler) BaseDir() string { return h.baseDir }

// Upload — POST /api/uploads
//
// Menerima satu berkas pada field multipart bernama "file".
func (h *UploadHandler) Upload(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, uploadMaxBytes)

	fileHeader, err := c.FormFile("file")
	if err != nil {
		// MaxBytesReader menyebabkan parsing gagal ketika badan permintaan
		// melewati batas; itu dilaporkan sebagai 413, bukan 422, supaya klien
		// tahu berkasnya yang terlalu besar dan bukan bentuk permintaannya yang
		// salah.
		if strings.Contains(err.Error(), "too large") {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{
				"error":         "File is too large",
				"max_size_byte": uploadMaxBytes,
			})
			return
		}
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "file is required"})
		return
	}

	if fileHeader.Size > uploadMaxBytes {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{
			"error":         "File is too large",
			"max_size_byte": uploadMaxBytes,
		})
		return
	}

	src, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Failed to read uploaded file"})
		return
	}
	defer src.Close()

	// Jenis berkas ditentukan dari isinya, bukan dari ekstensi maupun header
	// Content-Type yang dikirim klien. Keduanya sepenuhnya dikendalikan pengirim,
	// jadi mempercayainya berarti menerima berkas apa pun asal dinamai .jpg.
	head := make([]byte, uploadSniffLen)
	n, err := io.ReadFull(src, head)
	if err != nil && err != io.EOF && err != io.ErrUnexpectedEOF {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Failed to read uploaded file"})
		return
	}
	head = head[:n]

	contentType := http.DetectContentType(head)
	ext, ok := uploadAllowedTypes[contentType]
	if !ok {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error":          "Unsupported file type",
			"detected_type":  contentType,
			"allowed_values": []string{"image/jpeg", "image/png", "image/webp"},
		})
		return
	}

	// Nama dibuat server. Dua huruf pertama menjadi subdirektori supaya satu
	// direktori tidak menumpuk ratusan ribu entri, yang membuat operasi
	// filesystem melambat pada banyak sistem berkas.
	name := uuid.NewString()
	shard := name[:2]
	relPath := filepath.ToSlash(filepath.Join(shard, name+ext))

	dir := filepath.Join(h.baseDir, shard)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store file"})
		return
	}

	dst, err := os.Create(filepath.Join(h.baseDir, shard, name+ext))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store file"})
		return
	}
	defer dst.Close()

	// 512 byte pertama sudah terbaca untuk pemeriksaan jenis, jadi ditulis lebih
	// dulu sebelum sisanya disalin.
	if _, err := dst.Write(head); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store file"})
		return
	}
	if _, err := io.Copy(dst, src); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store file"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":      "File uploaded",
		"url":          "/uploads/" + relPath,
		"content_type": contentType,
		"size_byte":    fileHeader.Size,
	})
}
