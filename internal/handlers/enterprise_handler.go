package handlers

import (
	"database/sql"
	"net/http"
	"runtime"
	"time"

	"openjek-backend/internal/middleware"
	"openjek-backend/internal/models"
	"openjek-backend/internal/repository"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// EnterpriseHandler — handler untuk modul enterprise (Fase 1–7) sesuai master spec:
// Live Map, Multi-City, Branch, Fleet, Geo Zones, Services, Support/Dispute,
// Risk/Fraud, Approvals, Audit Logs, dan System Monitoring.
type EnterpriseHandler struct {
	db      *gorm.DB
	locRepo *repository.LocationRepository
	started time.Time
}

func NewEnterpriseHandler(db *gorm.DB, locRepo *repository.LocationRepository) *EnterpriseHandler {
	return &EnterpriseHandler{
		db:      db,
		locRepo: locRepo,
		started: time.Now(),
	}
}

// LogAdminAudit — helper untuk mencatat aksi back-office ke tabel audit_logs.
func LogAdminAudit(c *gin.Context, db *gorm.DB, module, action, targetType, targetID, summary string) {
	user := middleware.GetCurrentUserFromCtx(c)
	actorID := c.GetUint(middleware.UserIDKey)
	actorEmail := ""
	actorRole := ""
	if user != nil {
		actorEmail = user.Email
		actorRole = string(user.RoleCode)
	}
	_ = db.Create(&models.AuditLog{
		ActorID:    actorID,
		ActorEmail: actorEmail,
		ActorRole:  actorRole,
		Module:     module,
		Action:     action,
		TargetType: targetType,
		TargetID:   targetID,
		Summary:    summary,
		IPAddress:  c.ClientIP(),
		UserAgent:  c.Request.UserAgent(),
		CreatedAt:  time.Now(),
	})
}

// ── Live Map & Driver Locations (§8.2, CLAUDE.md §11.4) ──────────────────────

func (h *EnterpriseHandler) LiveDrivers(c *gin.Context) {
	var onlineDrivers []models.User
	h.db.Model(&models.User{}).
		Where("is_online = ? AND role_code IN ?", true, []string{
			string(models.RoleDriverMotorcycle), string(models.RoleDriverCar),
		}).
		Preload("Vehicles").
		Find(&onlineDrivers)

	driverIDs := make([]uint, 0, len(onlineDrivers))
	for _, d := range onlineDrivers {
		driverIDs = append(driverIDs, d.ID)
	}

	coords := h.locRepo.GetLiveDrivers(c.Request.Context(), driverIDs)

	type liveItem struct {
		DriverID    uint      `json:"driver_id"`
		Name        string    `json:"name"`
		RoleCode    string    `json:"role_code"`
		VehicleType string    `json:"vehicle_type"`
		PlateNumber string    `json:"plate_number"`
		Lat         float64   `json:"lat"`
		Lon         float64   `json:"lon"`
		HasLocation bool      `json:"has_location"`
		OnlineSince *time.Time `json:"online_since,omitempty"`
	}

	items := make([]liveItem, 0, len(onlineDrivers))
	for _, d := range onlineDrivers {
		vType := "motorcycle"
		plate := ""
		if d.RoleCode == models.RoleDriverCar {
			vType = "car"
		}
		if len(d.Vehicles) > 0 {
			plate = d.Vehicles[0].PlateNumber
		}
		pos, ok := coords[d.ID]
		items = append(items, liveItem{
			DriverID:    d.ID,
			Name:        d.Name,
			RoleCode:    string(d.RoleCode),
			VehicleType: vType,
			PlateNumber: plate,
			Lat:         pos[0],
			Lon:         pos[1],
			HasLocation: ok,
			OnlineSince: d.OnlineSince,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"drivers": items,
		"count":   len(items),
	})
}

// ── Multi-City & Multi-Branch (§16) ─────────────────────────────────────────

func (h *EnterpriseHandler) ListCities(c *gin.Context) {
	var cities []models.City
	h.db.Order("name asc").Find(&cities)
	c.JSON(http.StatusOK, gin.H{"cities": cities})
}

func (h *EnterpriseHandler) CreateCity(c *gin.Context) {
	var city models.City
	if err := c.ShouldBindJSON(&city); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}
	if err := h.db.Create(&city).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	LogAdminAudit(c, h.db, "cities", "create", "city", city.Code, "Membuat kota baru: "+city.Name)
	c.JSON(http.StatusCreated, gin.H{"city": city})
}

func (h *EnterpriseHandler) UpdateCity(c *gin.Context) {
	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}
	h.db.Model(&models.City{}).Where("id = ?", id).Updates(req)
	LogAdminAudit(c, h.db, "cities", "update", "city", uintToString(id), "Memperbarui data kota")
	c.JSON(http.StatusOK, gin.H{"message": "City updated"})
}

func (h *EnterpriseHandler) ListBranches(c *gin.Context) {
	var branches []models.Branch
	q := h.db.Model(&models.Branch{})
	if cid := c.Query("city_id"); cid != "" {
		q = q.Where("city_id = ?", cid)
	}
	q.Order("name asc").Find(&branches)
	c.JSON(http.StatusOK, gin.H{"branches": branches})
}

func (h *EnterpriseHandler) CreateBranch(c *gin.Context) {
	var branch models.Branch
	if err := c.ShouldBindJSON(&branch); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}
	if err := h.db.Create(&branch).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	LogAdminAudit(c, h.db, "branches", "create", "branch", branch.Code, "Membuat cabang: "+branch.Name)
	c.JSON(http.StatusCreated, gin.H{"branch": branch})
}

// ── Geographic Zones & Service Areas (§8.3–8.5) ──────────────────────────────

func (h *EnterpriseHandler) ListZones(c *gin.Context) {
	var zones []models.GeoZone
	q := h.db.Model(&models.GeoZone{})
	if zType := c.Query("zone_type"); zType != "" {
		q = q.Where("zone_type = ?", zType)
	}
	q.Order("created_at desc").Find(&zones)
	c.JSON(http.StatusOK, gin.H{"zones": zones})
}

func (h *EnterpriseHandler) CreateZone(c *gin.Context) {
	var zone models.GeoZone
	if err := c.ShouldBindJSON(&zone); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}
	if err := h.db.Create(&zone).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	LogAdminAudit(c, h.db, "zones", "create", "zone", uintToString(zone.ID), "Membuat zona: "+zone.Name)
	c.JSON(http.StatusCreated, gin.H{"zone": zone})
}

func (h *EnterpriseHandler) DeleteZone(c *gin.Context) {
	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}
	h.db.Delete(&models.GeoZone{}, id)
	LogAdminAudit(c, h.db, "zones", "delete", "zone", uintToString(id), "Menghapus zona geofence")
	c.JSON(http.StatusOK, gin.H{"message": "Zone deleted"})
}

// ── Service & Tariff Management (§9, §10.1) ──────────────────────────────────

func (h *EnterpriseHandler) ListServices(c *gin.Context) {
	var services []models.ServiceCatalog
	h.db.Order("id asc").Find(&services)
	c.JSON(http.StatusOK, gin.H{"services": services})
}

func (h *EnterpriseHandler) UpdateService(c *gin.Context) {
	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}
	h.db.Model(&models.ServiceCatalog{}).Where("id = ?", id).Updates(req)
	LogAdminAudit(c, h.db, "services", "update", "service", uintToString(id), "Mengubah konfigurasi layanan")
	c.JSON(http.StatusOK, gin.H{"message": "Service updated"})
}

// ── Fleet Directory (§7) ─────────────────────────────────────────────────────

func (h *EnterpriseHandler) ListFleet(c *gin.Context) {
	page, perPage, offset := paginate(c)
	var total int64
	q := h.db.Model(&models.Vehicle{})
	if v := c.Query("type"); v != "" {
		q = q.Where("type = ?", v)
	}
	if qSearch := c.Query("q"); qSearch != "" {
		like := "%" + qSearch + "%"
		q = q.Where("brand ILIKE ? OR model_name ILIKE ? OR plate_number ILIKE ?", like, like, like)
	}
	q.Count(&total)

	var vehicles []models.Vehicle
	q.Order("created_at desc").Limit(perPage).Offset(offset).Find(&vehicles)
	c.JSON(http.StatusOK, gin.H{
		"vehicles": vehicles,
		"meta":     gin.H{"page": page, "per_page": perPage, "total": total},
	})
}

// ── Support Tickets & Dispute Management (§14) ──────────────────────────────

func (h *EnterpriseHandler) ListTickets(c *gin.Context) {
	page, perPage, offset := paginate(c)
	var total int64
	q := h.db.Model(&models.SupportTicket{})
	if st := c.Query("status"); st != "" {
		q = q.Where("status = ?", st)
	}
	if pr := c.Query("priority"); pr != "" {
		q = q.Where("priority = ?", pr)
	}
	q.Count(&total)

	var tickets []models.SupportTicket
	q.Order("created_at desc").Limit(perPage).Offset(offset).Find(&tickets)
	c.JSON(http.StatusOK, gin.H{
		"tickets": tickets,
		"meta":    gin.H{"page": page, "per_page": perPage, "total": total},
	})
}

func (h *EnterpriseHandler) UpdateTicket(c *gin.Context) {
	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}
	var req struct {
		Status         string `json:"status"`
		Priority       string `json:"priority"`
		ResolutionNote string `json:"resolution_note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if req.Status != "" {
		updates["status"] = req.Status
		if req.Status == "resolved" || req.Status == "closed" {
			now := time.Now()
			updates["resolved_at"] = &now
		}
	}
	if req.Priority != "" {
		updates["priority"] = req.Priority
	}
	if req.ResolutionNote != "" {
		updates["resolution_note"] = req.ResolutionNote
	}

	h.db.Model(&models.SupportTicket{}).Where("id = ?", id).Updates(updates)
	LogAdminAudit(c, h.db, "support", "update", "ticket", uintToString(id), "Memperbarui status tiket: "+req.Status)
	c.JSON(http.StatusOK, gin.H{"message": "Ticket updated"})
}

// ── Risk & Fraud Management (§15) ────────────────────────────────────────────

func (h *EnterpriseHandler) ListRiskCases(c *gin.Context) {
	page, perPage, offset := paginate(c)
	var total int64
	q := h.db.Model(&models.RiskCase{})
	if st := c.Query("status"); st != "" {
		q = q.Where("status = ?", st)
	}
	q.Count(&total)

	var cases []models.RiskCase
	q.Order("risk_score desc, created_at desc").Limit(perPage).Offset(offset).Find(&cases)
	c.JSON(http.StatusOK, gin.H{
		"cases": cases,
		"meta":  gin.H{"page": page, "per_page": perPage, "total": total},
	})
}

func (h *EnterpriseHandler) UpdateRiskCase(c *gin.Context) {
	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}
	var req struct {
		Status      string `json:"status"`
		ActionTaken string `json:"action_taken"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}
	reviewerID := c.GetUint(middleware.UserIDKey)
	now := time.Now()
	h.db.Model(&models.RiskCase{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":       req.Status,
		"action_taken": req.ActionTaken,
		"reviewed_by":  reviewerID,
		"reviewed_at":  &now,
	})
	LogAdminAudit(c, h.db, "risk", "update", "case", uintToString(id), "Keputusan investigasi: "+req.Status)
	c.JSON(http.StatusOK, gin.H{"message": "Risk case updated"})
}

// ── Maker-Checker Approvals (§17.3) ──────────────────────────────────────────

func (h *EnterpriseHandler) ListApprovals(c *gin.Context) {
	page, perPage, offset := paginate(c)
	var total int64
	q := h.db.Model(&models.ApprovalRequest{})
	if st := c.Query("status"); st != "" {
		q = q.Where("status = ?", st)
	}
	q.Count(&total)

	var reqs []models.ApprovalRequest
	q.Order("created_at desc").Limit(perPage).Offset(offset).Find(&reqs)
	c.JSON(http.StatusOK, gin.H{
		"approvals": reqs,
		"meta":      gin.H{"page": page, "per_page": perPage, "total": total},
	})
}

func (h *EnterpriseHandler) DecideApproval(c *gin.Context) {
	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}
	var req struct {
		Status     string `json:"status" binding:"required,oneof=approved rejected"`
		ReviewNote string `json:"review_note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}
	reviewerID := c.GetUint(middleware.UserIDKey)
	now := time.Now()
	h.db.Model(&models.ApprovalRequest{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":      req.Status,
		"review_note": req.ReviewNote,
		"reviewed_by": reviewerID,
		"reviewed_at": &now,
	})
	LogAdminAudit(c, h.db, "approvals", req.Status, "approval", uintToString(id), req.ReviewNote)
	c.JSON(http.StatusOK, gin.H{"message": "Approval decided"})
}

// ── Audit Logs (§21) ─────────────────────────────────────────────────────────

func (h *EnterpriseHandler) ListAuditLogs(c *gin.Context) {
	page, perPage, offset := paginate(c)
	var total int64
	q := h.db.Model(&models.AuditLog{})
	if m := c.Query("module"); m != "" {
		q = q.Where("module = ?", m)
	}
	q.Count(&total)

	var logs []models.AuditLog
	q.Order("created_at desc").Limit(perPage).Offset(offset).Find(&logs)
	c.JSON(http.StatusOK, gin.H{
		"logs": logs,
		"meta": gin.H{"page": page, "per_page": perPage, "total": total},
	})
}

// ── Feature Flags & Integrations (§19.4) ────────────────────────────────────

func (h *EnterpriseHandler) ListFeatureFlags(c *gin.Context) {
	var flags []models.FeatureFlag
	h.db.Order("key asc").Find(&flags)
	c.JSON(http.StatusOK, gin.H{"flags": flags})
}

func (h *EnterpriseHandler) UpdateFeatureFlag(c *gin.Context) {
	key := c.Param("key")
	var req struct {
		Enabled    *bool `json:"enabled"`
		RolloutPct *int  `json:"rollout_pct"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}
	updates := map[string]interface{}{"updated_at": time.Now()}
	if req.Enabled != nil {
		updates["enabled"] = *req.Enabled
	}
	if req.RolloutPct != nil {
		updates["rollout_pct"] = *req.RolloutPct
	}
	h.db.Model(&models.FeatureFlag{}).Where("key = ?", key).Updates(updates)
	LogAdminAudit(c, h.db, "feature_flags", "update", "flag", key, "Mengubah status feature flag")
	c.JSON(http.StatusOK, gin.H{"message": "Feature flag updated"})
}

// ── Infrastructure & System Monitoring (§20) ─────────────────────────────────

func (h *EnterpriseHandler) SystemHealth(c *gin.Context) {
	var dbStats sql.DBStats
	dbOk := false
	if sqlDB, err := h.db.DB(); err == nil {
		dbStats = sqlDB.Stats()
		dbOk = sqlDB.Ping() == nil
	}

	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)

	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"uptime":  time.Since(h.started).Round(time.Second).String(),
		"started": h.started,
		"database": gin.H{
			"status":       dbOk,
			"open_conns":   dbStats.OpenConnections,
			"in_use":       dbStats.InUse,
			"idle":         dbStats.Idle,
			"wait_count":   dbStats.WaitCount,
			"wait_duration": dbStats.WaitDuration.String(),
		},
		"runtime": gin.H{
			"go_version": runtime.Version(),
			"goroutines": runtime.NumGoroutine(),
			"alloc_mb":   mem.Alloc / (1024 * 1024),
			"sys_mb":     mem.Sys / (1024 * 1024),
			"num_gc":     mem.NumGC,
		},
	})
}
