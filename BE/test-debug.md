# 🐛 Debug Food API - Lỗi 500

## 🔍 **Bước 0: Kiểm tra Admin Dashboard (Mới)**

```bash
curl -X GET "http://localhost:3000/foods/admin"
```

**Kết quả mong đợi:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "endpoints": ["GET /foods", "GET /foods/:rid", ...],
  "database": { "success": true, "message": "Database connection successful" },
  "cache": { "totalEntries": 0, "cacheSize": 300000, ... },
  "version": "1.0.0"
}
```

**Nếu fail:** Vấn đề ở server hoặc routing

---

## 🔍 **Bước 1: Kiểm tra Database Connection**

```bash
curl -X GET "http://localhost:3000/foods/test/database"
```

**Kết quả mong đợi:**
```json
{
  "success": true,
  "message": "Database connection successful",
  "details": { "total": 123 }
}
```

**Nếu fail:** Vấn đề ở kết nối database

---

## 🔍 **Bước 2: Kiểm tra View Count Field**

```bash
curl -X GET "http://localhost:3000/foods/test/view-count/18:2214"
```

**Kết quả mong đợi:**
```json
{
  "success": true,
  "message": "View count field exists and accessible",
  "details": {
    "@rid": "#18:2214",
    "name": "Tên món ăn",
    "view_count": 0
  }
}
```

**Nếu fail:** Vấn đề ở field `view_count`

---

## 🔍 **Bước 3: Test Manual Increment**

```bash
curl -X POST "http://localhost:3000/foods/18:2214/increment-view"
```

**Kết quả mong đợi:**
```json
{
  "foodRid": "18:2214",
  "message": "View count incremented from 0 to 1",
  "success": true
}
```

**Nếu fail:** Vấn đề ở UPDATE query

---

## 🔍 **Bước 3.5: Test DELETE Operation (Mới)**

```bash
curl -X GET "http://localhost:3000/foods/test/delete/19:2315"
```

**Kết quả mong đợi:**
```json
{
  "foodRid": "19:2315",
  "exists": true,
  "foodInfo": {
    "@rid": "#19:2315",
    "name": "Tên món ăn",
    "type": "Loại",
    "price": 50000
  },
  "canDelete": true,
  "message": "Food can be deleted"
}
```

**Nếu fail:** Vấn đề ở quyền DELETE hoặc food không tồn tại

---

## 🔍 **Bước 3.6: Test DELETE Operation với Logging (Mới)**

```bash
curl -X POST "http://localhost:3000/foods/test/delete-with-log/19:2315"
```

**Kết quả mong đợi:**
```json
{
  "foodRid": "19:2315",
  "success": true,
  "message": "DELETE operation successful via document endpoint",
  "details": {
    "result": {...},
    "deletedFood": {...}
  }
}
```

**Nếu fail:** Vấn đề ở OrientDB REST API hoặc quyền DELETE

---

## 🔍 **Bước 4: Test Get Detail (Có thể gây lỗi 500)**

```bash
curl -X GET "http://localhost:3000/foods/18:2214"
```

**Kết quả mong đợi:**
```json
{
  "@rid": "#18:2214",
  "name": "Tên món ăn",
  "description": "Mô tả",
  "categories": "Loại",
  "ingredients": "Nguyên liệu",
  "recipe": "Cách làm",
  "image_url": "URL ảnh",
  "price": 50000,
  "view_count": 1
}
```

**Nếu lỗi 500:** Xem logs để xác định vấn đề

---

## 📋 **Kiểm tra Logs**

Chạy server và xem logs khi gọi API:

```bash
# Terminal 1: Chạy server
npm run start:dev

# Terminal 2: Gọi API
curl -X GET "http://localhost:3000/foods/18:2214"
```

**Logs mong đợi:**
```
[FoodService] Getting food detail for RID: 18:2214
[FoodService] Cache miss for RID: 18:2214, querying database...
[FoodService] Found food: Tên món ăn, current view_count: 0
[FoodService] Starting view count increment for RID: 18:2214
[FoodService] Executing SQL: UPDATE Food SET view_count = COALESCE(view_count, 0) + 1 WHERE @rid = '18:2214'
[FoodService] View count increment successful for RID: 18:2214, result: {...}
[FoodService] Updated cache view_count to: 1
[FoodService] View count increment completed successfully for RID: 18:2214
```

---

## 🚨 **Các lỗi thường gặp:**

### **1. Database Connection Error:**
```
[FoodService] Database connection test failed: Connection refused
```
**Giải pháp:** Kiểm tra OrientDB server có chạy không

### **2. View Count Field Error:**
```
[FoodService] View count field test failed: Field 'view_count' not found
```
**Giải pháp:** Field `view_count` chưa được tạo trong database

### **3. SQL Syntax Error:**
```
[FoodService] Failed to increment view count: Invalid SQL syntax
```
**Giải pháp:** Kiểm tra cú pháp SQL trong OrientDB

### **4. Permission Error:**
```
[FoodService] Failed to increment view count: Permission denied
```
**Giải pháp:** Kiểm tra quyền user database

---

## 🔧 **Sửa lỗi theo từng bước:**

### **Nếu Bước 1 fail:**
- Kiểm tra OrientDB server
- Kiểm tra connection string
- Kiểm tra network

### **Nếu Bước 2 fail:**
- Tạo field `view_count` trong database
- Kiểm tra schema Food class

### **Nếu Bước 3 fail:**
- Kiểm tra cú pháp SQL
- Kiểm tra quyền UPDATE

### **Nếu Bước 4 fail:**
- Xem logs chi tiết
- Kiểm tra từng method trong service

---

## 📞 **Hỗ trợ:**

Nếu vẫn gặp vấn đề, hãy cung cấp:
1. **Logs từ server**
2. **Kết quả của 4 bước test trên**
3. **Error message cụ thể**
4. **OrientDB version và schema**

