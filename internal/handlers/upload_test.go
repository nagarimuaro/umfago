package handlers_test

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"openjek-backend/internal/models"
	"openjek-backend/internal/testutil"
)

// pngPixel — PNG 1x1 yang sah. Dipakai sebagai muatan yang benar-benar gambar,
// sehingga test bisa membedakan penolakan karena jenis dari penolakan lain.
var pngPixel = []byte{
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
	0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
	0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
	0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
	0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41,
	0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
	0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xdd, 0x8d,
	0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
	0x44, 0xae, 0x42, 0x60, 0x82,
}

// uploadRequest — bentuk permintaan multipart dengan satu berkas.
func uploadRequest(t *testing.T, filename string, content []byte, token string) *http.Request {
	t.Helper()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", filename)
	if err != nil {
		t.Fatal("CreateFormFile:", err)
	}
	if _, err := part.Write(content); err != nil {
		t.Fatal("write part:", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatal("close writer:", err)
	}

	req, _ := http.NewRequest("POST", "/api/uploads", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	return req
}

// TestUpload_PNG_Success — PNG kecil diterima 201 dan URL-nya bisa diambil
func TestUpload_PNG_Success(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	token := createUserWithRoleAndLoginInDB(t, db, router, "uploader@test.com", models.RoleCustomer)

	w := testutil.Do(router, uploadRequest(t, "test.png", pngPixel, token))
	if w.Code != http.StatusCreated {
		t.Fatalf("Status = %d, want 201. Body: %s", w.Code, w.Body.String())
	}

	resp := testutil.ParseJSON(w)
	url, _ := resp["url"].(string)
	if url == "" {
		t.Fatal("Response missing 'url' field")
	}
	if !strings.HasPrefix(url, "/uploads/") {
		t.Errorf("URL = %s, want prefix /uploads/", url)
	}
	if ct, _ := resp["content_type"].(string); ct != "image/png" {
		t.Errorf("content_type = %q, want image/png", ct)
	}

	// URL yang dikembalikan benar-benar bisa diambil lewat rute statis.
	getReq, _ := http.NewRequest("GET", url, nil)
	getW := testutil.Do(router, getReq)
	if getW.Code != http.StatusOK {
		t.Errorf("GET %s status = %d, want 200", url, getW.Code)
	}
}

// TestUpload_TooLarge_Rejected — berkas 6 MB ditolak 413
func TestUpload_TooLarge_Rejected(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	token := createUserWithRoleAndLoginInDB(t, db, router, "large@test.com", models.RoleCustomer)

	// Diawali tanda tangan PNG supaya yang diuji benar-benar batas ukuran,
	// bukan penolakan jenis.
	large := make([]byte, 6<<20)
	copy(large, pngPixel)

	w := testutil.Do(router, uploadRequest(t, "large.png", large, token))
	if w.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("Status = %d, want 413 for a 6 MB file", w.Code)
	}
}

// TestUpload_WrongType_Rejected — berkas .jpg yang isinya teks ditolak 422.
//
// Inilah yang membuktikan jenis diperiksa dari isi, bukan dari nama: ekstensi
// dan Content-Type keduanya mengaku gambar, isinya tidak.
func TestUpload_WrongType_Rejected(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	token := createUserWithRoleAndLoginInDB(t, db, router, "spoofed@test.com", models.RoleCustomer)

	w := testutil.Do(router, uploadRequest(t, "fake.jpg", []byte("This is not an image"), token))
	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("Status = %d, want 422 when content is not an image", w.Code)
	}

	resp := testutil.ParseJSON(w)
	if _, ok := resp["detected_type"]; !ok {
		t.Error("Response should report detected_type so the client knows what was read")
	}
}

// TestUpload_PathTraversal_Prevented — nama berkas dari klien dibuang seluruhnya
func TestUpload_PathTraversal_Prevented(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	token := createUserWithRoleAndLoginInDB(t, db, router, "attack@test.com", models.RoleCustomer)

	w := testutil.Do(router, uploadRequest(t, "../../etc/passwd", pngPixel, token))
	if w.Code != http.StatusCreated {
		t.Fatalf("Status = %d, want 201 — nama berkas seharusnya diabaikan, bukan menolak berkas", w.Code)
	}

	url, _ := testutil.ParseJSON(w)["url"].(string)
	if !strings.HasPrefix(url, "/uploads/") {
		t.Errorf("URL = %s, want prefix /uploads/", url)
	}
	if strings.Contains(url, "passwd") || strings.Contains(url, "..") {
		t.Errorf("URL = %s masih memuat komponen path dari klien", url)
	}

	// Berkas yang tertulis harus berada di dalam direktori unggahan. Yang
	// membuktikannya adalah rute statis: ia hanya menyajikan berkas di bawah
	// direktori itu, jadi 200 di sini berarti berkasnya memang ditulis di dalam.
	rel := strings.TrimPrefix(url, "/uploads/")
	if filepath.IsAbs(rel) || strings.Contains(rel, "..") {
		t.Errorf("Relative path = %s escapes the upload directory", rel)
	}

	getReq, _ := http.NewRequest("GET", url, nil)
	if getW := testutil.Do(router, getReq); getW.Code != http.StatusOK {
		t.Errorf("GET %s status = %d, want 200 — file should sit inside the upload dir", url, getW.Code)
	}

	// Tidak ada berkas yang tertulis di luar direktori unggahan.
	for _, escaped := range []string{"etc/passwd", "etc/passwd.png"} {
		if _, err := os.Stat(escaped); err == nil {
			t.Errorf("File created at %s — path traversal succeeded", escaped)
		}
	}
}

// TestUpload_MissingFile_Rejected — permintaan tanpa field "file" dibalas 422
func TestUpload_MissingFile_Rejected(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	token := createUserWithRoleAndLoginInDB(t, db, router, "nofile@test.com", models.RoleCustomer)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	_ = writer.WriteField("note", "tanpa berkas")
	writer.Close()

	req, _ := http.NewRequest("POST", "/api/uploads", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+token)

	w := testutil.Do(router, req)
	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("Status = %d, want 422 without a file field", w.Code)
	}
}

// TestUpload_NoAuth_Rejected — tanpa token dibalas 401
func TestUpload_NoAuth_Rejected(t *testing.T) {
	db := testutil.NewTestDB(t)
	router, _ := testutil.SetupRouter(db)

	w := testutil.Do(router, uploadRequest(t, "unauth.png", pngPixel, ""))
	if w.Code != http.StatusUnauthorized {
		t.Errorf("Status = %d, want 401 without token", w.Code)
	}
}
