package repository

import (
	"log"
	"os"
	"time"

	"openjek-backend/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// SeedEnterpriseDefaults — semai data bawaan untuk modul enterprise (services,
// kota, geofence, dan feature flag) bila tabel masih kosong. Idempoten.
func SeedEnterpriseDefaults(db *gorm.DB) {
	for _, s := range models.DefaultServices {
		var count int64
		db.Model(&models.ServiceCatalog{}).Where("code = ?", s.Code).Count(&count)
		if count == 0 {
			if err := db.Create(&s).Error; err != nil {
				log.Printf("[Enterprise] Failed to seed service %s: %v", s.Code, err)
			}
		}
	}

	for _, c := range models.DefaultCities {
		var count int64
		db.Model(&models.City{}).Where("code = ?", c.Code).Count(&count)
		if count == 0 {
			if err := db.Create(&c).Error; err != nil {
				log.Printf("[Enterprise] Failed to seed city %s: %v", c.Code, err)
			}
		}
	}

	for _, f := range models.DefaultFeatureFlags {
		var count int64
		db.Model(&models.FeatureFlag{}).Where("key = ?", f.Key).Count(&count)
		if count == 0 {
			if err := db.Create(&f).Error; err != nil {
				log.Printf("[Enterprise] Failed to seed flag %s: %v", f.Key, err)
			}
		}
	}

	// 1. Zona Geofence & Service Areas
	var zoneCount int64
	db.Model(&models.GeoZone{}).Count(&zoneCount)
	if zoneCount == 0 {
		var padang models.City
		if err := db.Where("code = ?", "PDG").First(&padang).Error; err == nil {
			_ = db.Create(&models.GeoZone{
				CityID:          padang.ID,
				Name:            "Pusat Kota Padang (Zona Ramai)",
				ZoneType:        "surge_zone",
				CenterLat:       padang.CenterLat,
				CenterLon:       padang.CenterLon,
				RadiusKm:        5,
				SurgeMultiplier: 1.25,
				IsActive:        true,
				Notes:           "Zona surge otomatis jam sibuk",
			})
			_ = db.Create(&models.GeoZone{
				CityID:          padang.ID,
				Name:            "Bandara Internasional Minangkabau (BIM)",
				ZoneType:        "pickup_point",
				CenterLat:       -0.7869,
				CenterLon:       100.2809,
				RadiusKm:        2,
				ExtraFeeIDR:     10000,
				IsActive:        true,
				Notes:           "Titik jemput khusus bandara",
			})
		}
	}

	// 2. Kantor Cabang (Branches)
	var branchCount int64
	db.Model(&models.Branch{}).Count(&branchCount)
	if branchCount == 0 {
		var padang models.City
		if err := db.Where("code = ?", "PDG").First(&padang).Error; err == nil {
			_ = db.Create(&models.Branch{
				CityID:      padang.ID,
				Code:        "PDG-PST",
				Name:        "Kantor Operasional Padang Pusat",
				Address:     "Jl. Sudirman No. 45, Padang",
				Phone:       "0751-123456",
				ManagerName: "Rian Pratama",
				IsActive:    true,
			})
		}
	}
}

// SeedOperationalDemoData — semai user demo, produk merchant demo, promo demo, dan order demo.
func SeedOperationalDemoData(db *gorm.DB) {
	demoPass := os.Getenv("DEMO_PASSWORD")
	if demoPass == "" {
		demoPass = "password123"
	}
	hashedPass, _ := bcrypt.GenerateFromPassword([]byte(demoPass), bcrypt.DefaultCost)
	roleRepo := NewRoleRepository(db)

	// Pastikan ada customer demo
	var customer models.User
	if err := db.Where("email = ?", "penumpang@openjek.id").First(&customer).Error; err != nil {
		customer = models.User{
			Name:       "Ahmad Fauzi",
			Email:      "penumpang@openjek.id",
			Phone:      "081234567888",
			Password:   string(hashedPass),
			RoleCode:   models.RoleCustomer,
			IsActive:   true,
			IsVerified: true,
			Balance:    150000,
		}
		if err := db.Create(&customer).Error; err == nil {
			_ = roleRepo.AssignRole(customer.ID, models.RoleCustomer)
		}
	} else if customer.Name == "Ahmad Fauzi (Penumpang)" {
		db.Model(&customer).Update("name", "Ahmad Fauzi")
	}

	// Pastikan ada driver motor demo
	var driverMotor models.User
	if err := db.Where("email = ?", "driver.motor@openjek.id").First(&driverMotor).Error; err != nil {
		driverMotor = models.User{
			Name:       "Budi Santoso (Driver Motor)",
			Email:      "driver.motor@openjek.id",
			Phone:      "081234567891",
			Password:   string(hashedPass),
			RoleCode:   models.RoleDriverMotorcycle,
			IsActive:   true,
			IsVerified: true,
			IsOnline:   true,
			Balance:    85000,
		}
		if err := db.Create(&driverMotor).Error; err == nil {
			_ = roleRepo.AssignRole(driverMotor.ID, models.RoleDriverMotorcycle)
			now := time.Now()
			expiry := now.AddDate(2, 0, 0)
			_ = db.Create(&models.DriverProfile{
				UserID:                      driverMotor.ID,
				IdentityCardNumber:          "1371012345670001",
				IdentityCardPhotoURL:        "/uploads/ktp-sample.jpg",
				LicenseNumber:               "9876543210",
				LicenseExpiry:               &expiry,
				LicensePhotoURL:             "/uploads/sim-sample.jpg",
				VehicleRegistrationNumber:   "BA 1234 XY",
				VehicleRegistrationPhotoURL: "/uploads/stnk-sample.jpg",
				SelfiePhotoURL:              "/uploads/selfie-sample.jpg",
				BankName:                    "Bank Nagari",
				BankAccountNumber:           "1100223344",
				BankAccountName:             "Budi Santoso",
				KYCStatus:                   models.KYCApproved,
				KYCSubmittedAt:              &now,
				KYCReviewedAt:               &now,
				TotalTrips:                  48,
				IsActive:                    true,
			})
			_ = db.Create(&models.Vehicle{
				UserID:      driverMotor.ID,
				Type:        "motorcycle",
				Brand:       "Honda",
				ModelName:   "Vario 160",
				PlateNumber: "BA 1234 XY",
				IsActive:    true,
			})
		}
	}

	// Pastikan ada driver mobil demo
	var driverMobil models.User
	if err := db.Where("email = ?", "driver.mobil@openjek.id").First(&driverMobil).Error; err != nil {
		driverMobil = models.User{
			Name:       "Eko Prasetyo (Driver Mobil)",
			Email:      "driver.mobil@openjek.id",
			Phone:      "081234567892",
			Password:   string(hashedPass),
			RoleCode:   models.RoleDriverCar,
			IsActive:   true,
			IsVerified: true,
			IsOnline:   true,
			Balance:    240000,
		}
		if err := db.Create(&driverMobil).Error; err == nil {
			_ = roleRepo.AssignRole(driverMobil.ID, models.RoleDriverCar)
			now := time.Now()
			expiry := now.AddDate(3, 0, 0)
			_ = db.Create(&models.DriverProfile{
				UserID:                      driverMobil.ID,
				IdentityCardNumber:          "1371012345670002",
				IdentityCardPhotoURL:        "/uploads/ktp-sample.jpg",
				LicenseNumber:               "8765432109",
				LicenseExpiry:               &expiry,
				LicensePhotoURL:             "/uploads/sim-sample.jpg",
				VehicleRegistrationNumber:   "BA 5678 AB",
				VehicleRegistrationPhotoURL: "/uploads/stnk-sample.jpg",
				SelfiePhotoURL:              "/uploads/selfie-sample.jpg",
				BankName:                    "BCA",
				BankAccountNumber:           "8899001122",
				BankAccountName:             "Eko Prasetyo",
				KYCStatus:                   models.KYCApproved,
				KYCSubmittedAt:              &now,
				KYCReviewedAt:               &now,
				TotalTrips:                  32,
				IsActive:                    true,
			})
			_ = db.Create(&models.Vehicle{
				UserID:      driverMobil.ID,
				Type:        "car",
				Brand:       "Toyota",
				ModelName:   "Avanza",
				PlateNumber: "BA 5678 AB",
				IsActive:    true,
			})
		}
	}

	// Pastikan ada driver yang menunggu KYC (pending)
	var driverPending models.User
	if err := db.Where("email = ?", "calon.driver@openjek.id").First(&driverPending).Error; err != nil {
		driverPending = models.User{
			Name:       "Doni Saputra (Antrean KYC)",
			Email:      "calon.driver@openjek.id",
			Phone:      "081234567893",
			Password:   string(hashedPass),
			RoleCode:   models.RoleDriverMotorcycle,
			IsActive:   true,
			IsVerified: false,
			Balance:    0,
		}
		if err := db.Create(&driverPending).Error; err == nil {
			_ = roleRepo.AssignRole(driverPending.ID, models.RoleDriverMotorcycle)
			now := time.Now()
			expiry := now.AddDate(1, 0, 0)
			_ = db.Create(&models.DriverProfile{
				UserID:                      driverPending.ID,
				IdentityCardNumber:          "1371012345670003",
				IdentityCardPhotoURL:        "https://via.placeholder.com/600x400.png?text=KTP+Doni",
				LicenseNumber:               "7654321098",
				LicenseExpiry:               &expiry,
				LicensePhotoURL:             "https://via.placeholder.com/600x400.png?text=SIM+Doni",
				VehicleRegistrationNumber:   "BA 9999 ZZ",
				VehicleRegistrationPhotoURL: "https://via.placeholder.com/600x400.png?text=STNK+Doni",
				SelfiePhotoURL:              "https://via.placeholder.com/600x400.png?text=Selfie+Doni",
				BankName:                    "BRI",
				BankAccountNumber:           "3344556677",
				BankAccountName:             "Doni Saputra",
				KYCStatus:                   models.KYCPending,
				KYCSubmittedAt:              &now,
				IsActive:                    true,
			})
			_ = db.Create(&models.Vehicle{
				UserID:      driverPending.ID,
				Type:        "motorcycle",
				Brand:       "Yamaha",
				ModelName:   "NMAX",
				PlateNumber: "BA 9999 ZZ",
				IsActive:    true,
			})
		}
	}

	// Pastikan ada Merchant demo
	var merchantUser models.User
	if err := db.Where("email = ?", "warung.padang@openjek.id").First(&merchantUser).Error; err != nil {
		merchantUser = models.User{
			Name:       "Siti Rahma (Owner Warung)",
			Email:      "warung.padang@openjek.id",
			Phone:      "081234567894",
			Password:   string(hashedPass),
			RoleCode:   models.RoleMerchant,
			IsActive:   true,
			IsVerified: true,
			Balance:    320000,
		}
		if err := db.Create(&merchantUser).Error; err == nil {
			_ = roleRepo.AssignRole(merchantUser.ID, models.RoleMerchant)
			var profile models.MerchantProfile
			profile = models.MerchantProfile{
				UserID:          merchantUser.ID,
				BusinessName:    "Restoran Sederhana Bundo",
				BusinessAddress: "Jl. Veteran No. 12, Padang",
				Category:        "makanan",
				Lat:             -0.9450,
				Lon:             100.3600,
				Rating:          4.9,
				ReviewCount:     120,
				LogoURL:         "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500",
				IsActive:        true,
				IsOpen:          true,
			}
			if err := db.Create(&profile).Error; err == nil {
				_ = db.Create(&models.Product{
					MerchantID:  profile.ID,
					Name:        "Nasi Rendang Komplit",
					Description: "Rendang sapi khas Minang dengan sayur kapau & sambal ijo",
					Price:       25000,
					Category:    "makanan",
					IsAvailable: true,
				})
				_ = db.Create(&models.Product{
					MerchantID:  profile.ID,
					Name:        "Es Teh Manis",
					Description: "Es teh manis segar",
					Price:       5000,
					Category:    "minuman",
					IsAvailable: true,
				})
			}
		}
	}

	// Pastikan ada merchant kuliner populer (Burger Broz)
	var burgerUser models.User
	if err := db.Where("email = ?", "burger.broz@openjek.id").First(&burgerUser).Error; err != nil {
		burgerUser = models.User{
			Name:       "Burger Broz Official",
			Email:      "burger.broz@openjek.id",
			Phone:      "081234567895",
			Password:   string(hashedPass),
			RoleCode:   models.RoleMerchant,
			IsActive:   true,
			IsVerified: true,
			Balance:    540000,
		}
		if err := db.Create(&burgerUser).Error; err == nil {
			_ = roleRepo.AssignRole(burgerUser.ID, models.RoleMerchant)
			burgerProfile := models.MerchantProfile{
				UserID:          burgerUser.ID,
				BusinessName:    "Burger Broz",
				BusinessAddress: "Jl. Khatib Sulaiman No. 42, Padang",
				Category:        "burgers",
				Lat:             -0.9312,
				Lon:             100.3580,
				Rating:          4.9,
				ReviewCount:     350,
				LogoURL:         "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500",
				IsActive:        true,
				IsOpen:          true,
			}
			if err := db.Create(&burgerProfile).Error; err == nil {
				_ = db.Create(&models.Product{
					MerchantID:  burgerProfile.ID,
					Name:        "Classic Double Cheeseburger",
					Description: "Dua lapis daging sapi panggang dengan double keju cheddar leleh dan saus spesial",
					Price:       35000,
					Category:    "must-try",
					IsAvailable: true,
				})
				_ = db.Create(&models.Product{
					MerchantID:  burgerProfile.ID,
					Name:        "Smoky BBQ Bacon Burger",
					Description: "Burger daging sapi dengan saus BBQ asap, onion ring renyah, dan keju",
					Price:       38000,
					Category:    "combos",
					IsAvailable: true,
				})
				_ = db.Create(&models.Product{
					MerchantID:  burgerProfile.ID,
					Name:        "Crispy French Fries",
					Description: "Kentang goreng renyah bumbu gurih khas Broz",
					Price:       15000,
					Category:    "a-la-carte",
					IsAvailable: true,
				})
				_ = db.Create(&models.Product{
					MerchantID:  burgerProfile.ID,
					Name:        "Milkshake Cokelat Belgia",
					Description: "Milkshake kental dengan cokelat impor Belgia yang manis pas",
					Price:       18000,
					Category:    "drinks",
					IsAvailable: true,
				})
			}
		}
	}

	// Alamat tersimpan awal untuk customer demo
	if customer.ID != 0 {
		var addrCount int64
		db.Model(&models.UserAddress{}).Where("user_id = ?", customer.ID).Count(&addrCount)
		if addrCount == 0 {
			_ = db.Create(&models.UserAddress{
				UserID:    customer.ID,
				Label:     "Rumah",
				Address:   "Jl. Sudirman No. 45, Padang Barat, Kota Padang",
				Note:      "Pagar warna hitam samping toko buku",
				Area:      "Padang Barat",
				Lat:       -0.9471,
				Lon:       100.4172,
				Icon:      "home",
				IsDefault: true,
			})
			_ = db.Create(&models.UserAddress{
				UserID:    customer.ID,
				Label:     "Kantor / Tempat Kerja",
				Address:   "Plaza Andalas Lantai 3, Jl. Pemuda No. 1, Padang",
				Note:      "Lobby timur",
				Area:      "Padang Barat",
				Lat:       -0.9250,
				Lon:       100.3600,
				Icon:      "work",
				IsDefault: false,
			})
		}
	}

	// 4. Order Contoh (Order Selesai & Sedang Berjalan)
	var custUser, dMotor, dMobil models.User
	_ = db.Where("email = ?", "penumpang@openjek.id").First(&custUser).Error
	_ = db.Where("email = ?", "driver.motor@openjek.id").First(&dMotor).Error
	_ = db.Where("email = ?", "driver.mobil@openjek.id").First(&dMobil).Error

	now := time.Now()
	var ord1 models.Order
	if err := db.Where("uuid = ?", "OJ-ORD-1001").First(&ord1).Error; err != nil && custUser.ID != 0 && dMotor.ID != 0 {
		accepted := now.Add(-25 * time.Minute)
		arrived := now.Add(-20 * time.Minute)
		picked := now.Add(-15 * time.Minute)
		completed := now.Add(-5 * time.Minute)

		rating5 := 5
		_ = db.Create(&models.Order{
			UUID:           "OJ-ORD-1001",
			RiderID:        custUser.ID,
			DriverID:       &dMotor.ID,
			Status:         models.StatusCompleted,
			PickupLat:      -0.9471,
			PickupLon:      100.4172,
			PickupAddress:  "Jl. Sudirman No. 10 (Kantor Pos)",
			DropoffLat:     -0.9250,
			DropoffLon:     100.3600,
			DropoffAddress: "Plaza Andalas Padang",
			DistanceKm:     4.5,
			FareAmount:     13500,
			CustomerFee:    1000,
			PlatformFee:    2700,
			DriverEarning:  10800,
			Currency:       "IDR",
			PaymentMethod:  models.PaymentWallet,
			VehicleType:    "motorcycle",
			CustomerRating: &rating5,
			ReviewNote:     "Driver ramah dan tepat waktu",
			AcceptedAt:     &accepted,
			ArrivedAt:      &arrived,
			PickedUpAt:     &picked,
			CompletedAt:    &completed,
		})
	}

	// Order yang sedang berjalan
	var ord2 models.Order
	if err := db.Where("uuid = ?", "OJ-ORD-1002").First(&ord2).Error; err != nil && custUser.ID != 0 && dMobil.ID != 0 {
		orderInProg := now.Add(-8 * time.Minute)
		_ = db.Create(&models.Order{
			UUID:           "OJ-ORD-1002",
			RiderID:        custUser.ID,
			DriverID:       &dMobil.ID,
			Status:         models.StatusInProgress,
			PickupLat:      -0.9300,
			PickupLon:      100.3700,
			PickupAddress:  "Hotel Grand Inna Padang",
			DropoffLat:     -0.7869,
			DropoffLon:     100.2809,
			DropoffAddress: "Bandara Internasional Minangkabau (BIM)",
			DistanceKm:     22.0,
			FareAmount:     110000,
			CustomerFee:    2000,
			PlatformFee:    22000,
			DriverEarning:  88000,
			Currency:       "IDR",
			PaymentMethod:  models.PaymentCash,
			VehicleType:    "car",
			AcceptedAt:     &orderInProg,
			PickedUpAt:     &orderInProg,
		})

		// Seed pesan chat awal untuk OJ-ORD-1002
		_ = db.Create(&models.ChatMessage{
			OrderUUID:  "OJ-ORD-1002",
			SenderID:   custUser.ID,
			ReceiverID: dMobil.ID,
			Message:    "Halo pak, saya tunggu di lobby utama hotel ya.",
			IsRead:     true,
		})
		_ = db.Create(&models.ChatMessage{
			OrderUUID:  "OJ-ORD-1002",
			SenderID:   dMobil.ID,
			ReceiverID: custUser.ID,
			Message:    "Siap kak, saya pakai Avanza hitam BA 5678 AB, 3 menit lagi sampai.",
			IsRead:     true,
		})
	}

	// 5. Tiket Support / Dispute Contoh (§14)
	var ticketCount int64
	db.Model(&models.SupportTicket{}).Count(&ticketCount)
	if ticketCount == 0 && custUser.ID != 0 {
		_ = db.Create(&models.SupportTicket{
			UserID:      custUser.ID,
			OrderUUID:   "OJ-ORD-1001",
			Category:    "payment",
			Priority:    "medium",
			Status:      "open",
			Subject:     "Saldo e-wallet terpotong dobel pada promo",
			Description: "Saat memesan order OJ-ORD-1001 saldo terpotong 14.500 padahal seharusnya ada diskon promo.",
		})
		_ = db.Create(&models.SupportTicket{
			UserID:         custUser.ID,
			Category:       "safety",
			Priority:       "high",
			Status:         "resolved",
			Subject:        "Barang tertinggal di helm driver",
			Description:    "Kacamata tertinggal di bagasi motor driver.",
			ResolutionNote: "Driver sudah mengembalikan barang ke kantor cabang Padang Pusat.",
		})
	}

	// 6. Kasus Kecurangan / Risk Fraud Contoh (§15)
	var riskCount int64
	db.Model(&models.RiskCase{}).Count(&riskCount)
	if riskCount == 0 && dMotor.ID != 0 {
		_ = db.Create(&models.RiskCase{
			UserID:      dMotor.ID,
			OrderUUID:   "OJ-ORD-1001",
			RiskType:    "abnormal_route",
			Severity:    "medium",
			RiskScore:   68,
			Status:      "open",
			Summary:     "Rute perjalanan terdeteksi melenceng 3 km dari rute optimal Valhalla.",
			ActionTaken: "",
		})
	}

	// 7. Alur Persetujuan (Maker-Checker) Contoh (§17.3)
	var approvalCount int64
	db.Model(&models.ApprovalRequest{}).Count(&approvalCount)
	if approvalCount == 0 && custUser.ID != 0 {
		_ = db.Create(&models.ApprovalRequest{
			Module:      "refund",
			Action:      "Refund Pembatalan Khusus Rp 50.000",
			TargetID:    "OJ-ORD-1001",
			PayloadJSON: `{"amount": 50000, "user_id": 2}`,
			Reason:      "Permintaan kompensasi dari Customer Service atas keterlambatan 40 menit",
			RequestedBy: custUser.ID,
			Status:      "pending",
		})
	}

	// 8. Promo / Voucher Bawaan (§13)
	var promoCount int64
	db.Model(&models.Promo{}).Count(&promoCount)
	if promoCount == 0 {
		now := time.Now()
		_ = db.Create(&models.Promo{
			Code:          "HEMAT10",
			Name:          "Diskon Spesial Pengguna Baru",
			Description:   "Potongan Rp 3.000 untuk perjalanan jarak dekat",
			DiscountType:  models.DiscountFixed,
			DiscountValue: 3000,
			MinFare:       9000,
			Quota:         500,
			PerUserLimit:  2,
			StartsAt:      now.Add(-24 * time.Hour),
			EndsAt:        now.AddDate(0, 1, 0),
			IsActive:      true,
		})
		_ = db.Create(&models.Promo{
			Code:          "DISKON20",
			Name:          "Diskon 20% Liburan",
			Description:   "Potongan 20% maksimal Rp 10.000",
			DiscountType:  models.DiscountPercent,
			DiscountValue: 20,
			MaxDiscount:   10000,
			MinFare:       15000,
			Quota:         1000,
			PerUserLimit:  1,
			StartsAt:      now.Add(-24 * time.Hour),
			EndsAt:        now.AddDate(0, 2, 0),
			IsActive:      true,
		})
	}
}

