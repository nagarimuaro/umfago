package handlers

import (
	"hash/fnv"
	"math/rand"
	"net/http"
	"sort"
	"time"

	"openjek-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Tetapan peringkat.
//
// Bobotnya menempatkan pembelian di atas penayangan: satu orang yang membayar
// mengatakan lebih banyak tentang sebuah produk daripada sepuluh orang yang
// hanya melihat-lihat. Rating diberi porsi terkecil karena produk yang baru
// dijual belum sempat mengumpulkannya.
const (
	rankWindowDays = 30
	rankWeightOrder  = 0.5
	rankWeightView   = 0.3
	rankWeightRating = 0.2

	// Kuota eksplorasi: dari tiap 20 slot, 6 disediakan bagi produk sepi atau
	// baru. Tanpa kuota ini, daftar yang diurutkan murni oleh popularitas
	// mengunci pendatang di halaman belakang selamanya — produk sepi tidak
	// pernah terlihat, jadi tidak pernah laku, jadi tetap sepi.
	rankPageSlots       = 20
	rankExplorationSlots = 6

	// Ambang "sepi" dan "baru". Produk yang memenuhi salah satunya berhak atas
	// slot eksplorasi.
	rankQuietViewThreshold = 10
	rankFreshDays          = 14

	// Rating netral untuk produk yang belum dinilai siapa pun. Nol akan
	// memperlakukan "belum punya rating" sama dengan "ratingnya buruk", dan itu
	// cara paling cepat mengubur produk baru.
	rankNeutralRating = 3.0
)

// ProductHandler — katalog dari sudut pandang pembeli.
type ProductHandler struct {
	db *gorm.DB
}

func NewProductHandler(db *gorm.DB) *ProductHandler {
	return &ProductHandler{db: db}
}

// rankedProduct — satu produk beserta angka jendela 30 hari dan skornya.
type rankedProduct struct {
	models.Product
	MerchantName   string  `gorm:"column:merchant_name" json:"merchant_name"`
	MerchantOpen   bool    `gorm:"column:merchant_open" json:"merchant_open"`
	ViewCount30d   int64   `gorm:"column:view_30d" json:"view_count_30d"`
	OrderCount30d  int64   `gorm:"column:order_30d" json:"order_count_30d"`
	Score          float64 `gorm:"-" json:"score"`
	IsExploration  bool    `gorm:"-" json:"is_exploration"`
}

// List — GET /api/products
//
// Yang didaftar adalah produk, bukan merchant; merchant muncul sebagai atribut
// pada tiap baris, dan detail produklah yang mengarahkan pembeli ke lapaknya.
func (h *ProductHandler) List(c *gin.Context) {
	since := time.Now().AddDate(0, 0, -rankWindowDays)

	// Satu query agregat: produk beserta hitungan penayangan dan pemesanan di
	// dalam jendela. Sub-query dipakai alih-alih dua JOIN langsung supaya produk
	// tanpa peristiwa sama sekali tetap ikut terambil.
	query := h.db.Table("products p").
		Select(`p.*,
			m.business_name AS merchant_name,
			m.is_open       AS merchant_open,
			COALESCE(v.c, 0) AS view_30d,
			COALESCE(o.c, 0) AS order_30d`).
		Joins("JOIN merchant_profiles m ON m.id = p.merchant_id AND m.deleted_at IS NULL").
		Joins(`LEFT JOIN (SELECT product_id, COUNT(*) c FROM product_events
			WHERE kind = ? AND created_at > ? GROUP BY product_id) v ON v.product_id = p.id`,
			models.ProductEventView, since).
		Joins(`LEFT JOIN (SELECT product_id, COUNT(*) c FROM product_events
			WHERE kind = ? AND created_at > ? GROUP BY product_id) o ON o.product_id = p.id`,
			models.ProductEventOrder, since).
		Where("p.deleted_at IS NULL AND p.is_available = ? AND m.is_active = ?", true, true)

	// Merchant yang sedang tutup TIDAK disembunyikan, hanya ditandai lewat
	// merchant_open. Menyembunyikannya membuat katalog berkedip mengikuti jam
	// buka, dan pembeli kehilangan cara menemukan warung yang mereka cari di luar
	// jam operasionalnya.

	// Penyaringan eksplisit dari pengguna.
	filtered := false
	if v := c.Query("merchant_id"); v != "" {
		query = query.Where("p.merchant_id = ?", v)
		filtered = true
	}
	if v := c.Query("category"); v != "" {
		query = query.Where("p.category = ?", v)
		filtered = true
	}
	if v := c.Query("q"); v != "" {
		query = query.Where("p.name ILIKE ? OR p.description ILIKE ?", "%"+v+"%", "%"+v+"%")
		filtered = true
	}

	var candidates []rankedProduct
	if err := query.Scan(&candidates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch products"})
		return
	}

	scoreProducts(candidates)

	page, perPage, _ := paginate(c)
	total := int64(len(candidates))

	// Pencarian dan penyaringan mematikan kuota eksplorasi: orang yang mengetik
	// nama produk sedang mencari sesuatu yang spesifik, bukan sedang menjelajah,
	// dan menyelipkan produk sepi ke dalam hasil pencariannya hanya mengganggu.
	var ordered []rankedProduct
	if filtered {
		sort.SliceStable(candidates, func(i, j int) bool {
			return candidates[i].Score > candidates[j].Score
		})
		ordered = candidates
	} else {
		ordered = interleaveExploration(candidates, perPage)
	}

	// Pemotongan halaman dilakukan setelah urutan lengkap disusun, sehingga tidak
	// ada produk yang muncul di dua halaman sekaligus atau hilang di antaranya.
	start := (page - 1) * perPage
	if start > len(ordered) {
		start = len(ordered)
	}
	end := start + perPage
	if end > len(ordered) {
		end = len(ordered)
	}

	c.JSON(http.StatusOK, gin.H{
		"products": ordered[start:end],
		"meta": gin.H{
			"page": page, "per_page": perPage, "total": total,
			"ranking_window_days": rankWindowDays,
			"exploration_enabled": !filtered,
		},
	})
}

// Get — GET /api/products/:id
func (h *ProductHandler) Get(c *gin.Context) {
	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}

	var product models.Product
	if err := h.db.Preload("Merchant").First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	// Produk yang dikosongkan atau milik merchant yang belum disetujui tidak
	// dapat dibuka pembeli, sama seperti ia tidak muncul di daftar.
	if !product.IsAvailable || product.Merchant == nil || !product.Merchant.IsActive {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	h.recordView(product.ID)

	c.JSON(http.StatusOK, gin.H{"product": product})
}

// recordView — catat satu penayangan untuk keperluan peringkat.
//
// Kegagalannya sengaja diabaikan: statistik peringkat tidak boleh membuat
// halaman detail gagal dimuat.
func (h *ProductHandler) recordView(productID uint) {
	RecordProductEvent(h.db, productID, models.ProductEventView)
}

// RecordProductEvent — catat satu peristiwa produk dan naikkan penghitung
// kumulatifnya.
//
// Diekspor karena pemesanan produk akan memanggilnya dari alur order begitu
// modul pemesanan makanan ada. Penghitung dinaikkan dengan ekspresi SQL, bukan
// baca-lalu-tulis, sehingga dua permintaan bersamaan tidak saling menimpa.
func RecordProductEvent(db *gorm.DB, productID uint, kind string) {
	if db == nil || productID == 0 {
		return
	}

	column := "view_count"
	if kind == models.ProductEventOrder {
		column = "order_count"
	}

	_ = db.Create(&models.ProductEvent{ProductID: productID, Kind: kind}).Error
	_ = db.Model(&models.Product{}).Where("id = ?", productID).
		UpdateColumn(column, gorm.Expr(column+" + 1")).Error
}

// scoreProducts — isi field Score dengan skor gabungan ternormalisasi.
//
// Normalisasi min-maks dihitung atas kumpulan kandidat pada permintaan itu
// sendiri, bukan atas seluruh tabel, supaya skornya tidak bergantung pada satuan
// mentah: seratus pesanan adalah angka besar di katalog kecil dan angka biasa di
// katalog besar.
func scoreProducts(products []rankedProduct) {
	if len(products) == 0 {
		return
	}

	var maxOrder, maxView int64
	for _, p := range products {
		if p.OrderCount30d > maxOrder {
			maxOrder = p.OrderCount30d
		}
		if p.ViewCount30d > maxView {
			maxView = p.ViewCount30d
		}
	}

	for i := range products {
		rating := products[i].AvgRating
		if products[i].RatingCount == 0 {
			rating = rankNeutralRating
		}

		products[i].Score = rankWeightOrder*normalize(products[i].OrderCount30d, maxOrder) +
			rankWeightView*normalize(products[i].ViewCount30d, maxView) +
			rankWeightRating*(rating/5.0)
	}
}

func normalize(value, max int64) float64 {
	if max <= 0 {
		return 0
	}
	return float64(value) / float64(max)
}

// interleaveExploration — susun urutan akhir dengan menyisipkan kuota
// eksplorasi.
//
// Dari tiap blok slot, sebagian besar diisi urut skor dan sisanya diambil dari
// produk sepi atau baru yang diacak dengan benih harian. Deterministik per hari
// berarti pengguna yang menggulir naik-turun melihat urutan yang stabil, tetapi
// besok giliran produk sepi yang lain. Tanpa benih harian, "adil" berarti setiap
// pemuatan ulang mengocok daftar dan pengguna kehilangan tempatnya.
func interleaveExploration(products []rankedProduct, perPage int) []rankedProduct {
	if len(products) == 0 {
		return products
	}

	fresh := time.Now().AddDate(0, 0, -rankFreshDays)

	var popular, quiet []rankedProduct
	for _, p := range products {
		if p.ViewCount30d < rankQuietViewThreshold || p.CreatedAt.After(fresh) {
			p.IsExploration = true
			quiet = append(quiet, p)
			continue
		}
		popular = append(popular, p)
	}

	sort.SliceStable(popular, func(i, j int) bool { return popular[i].Score > popular[j].Score })

	// Benih harian: tanggal saja, tanpa jam, supaya urutannya tetap sepanjang
	// hari dan berganti keesokan harinya.
	seed := fnv.New64a()
	_, _ = seed.Write([]byte(time.Now().Format("2006-01-02")))
	shuffler := rand.New(rand.NewSource(int64(seed.Sum64())))
	shuffler.Shuffle(len(quiet), func(i, j int) { quiet[i], quiet[j] = quiet[j], quiet[i] })

	// Jumlah slot eksplorasi mengikuti ukuran halaman yang diminta, sehingga
	// perbandingannya tetap sama pada per_page berapa pun.
	explorationPerPage := rankExplorationSlots * perPage / rankPageSlots
	if explorationPerPage < 1 && len(quiet) > 0 {
		explorationPerPage = 1
	}
	popularPerPage := perPage - explorationPerPage

	out := make([]rankedProduct, 0, len(products))
	pi, qi := 0, 0

	for pi < len(popular) || qi < len(quiet) {
		// Satu blok setara satu halaman. Bila salah satu kelompok habis, sisanya
		// diisi dari kelompok yang lain — halaman tidak pernah lebih pendek dari
		// seharusnya hanya karena kuotanya tidak terpenuhi.
		taken := 0
		for taken < popularPerPage && pi < len(popular) {
			out = append(out, popular[pi])
			pi++
			taken++
		}
		for taken < perPage && qi < len(quiet) {
			out = append(out, quiet[qi])
			qi++
			taken++
		}
		for taken < perPage && pi < len(popular) {
			out = append(out, popular[pi])
			pi++
			taken++
		}
		if taken == 0 {
			break
		}
	}

	return out
}
