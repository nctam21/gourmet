# Test View Count API

## Vấn đề hiện tại
API get detail không tăng view count mỗi lần gọi.

## Các bước debug

### 1. Kiểm tra logs
Khi gọi API, xem console logs:
```bash
# Gọi API get detail
GET /foods/rid/18:2214

# Xem logs trong console:
[FoodService] Getting food detail for RID: 18:2214
[FoodService] Cache miss for RID: 18:2214, querying database...
[FoodService] Found food: mực hấp gừng, current view_count: 0
[FoodService] Incrementing view count for RID: 18:2214, current: 0
[FoodService] SQL Query: UPDATE Food SET view_count = COALESCE(view_count, 0) + 1 WHERE @rid = '#18:2214'
[FoodService] View count increment successful for RID: 18:2214, result: {...}
```

### 2. Test endpoint manual increment
```bash
# Test tăng view count thủ công
POST /foods/18:2214/increment-view

# Response mong đợi:
{
  "foodRid": "18:2214",
  "message": "View count incremented from 0 to 1",
  "success": true
}
```

### 3. Kiểm tra view count
```bash
# Kiểm tra view count hiện tại
GET /foods/18:2214/view-count

# Response mong đợi:
{
  "foodRid": "18:2214",
  "viewCount": 1
}
```

### 4. Test lại get detail
```bash
# Gọi lại get detail
GET /foods/rid/18:2214

# Xem logs:
[FoodService] Getting food detail for RID: 18:2214
[FoodService] Cache hit for RID: 18:2214, current view_count: 1
[FoodService] Incrementing view count for RID: 18:2214, current: 1
```

## Các vấn đề có thể xảy ra

### 1. SQL Query không đúng
- Kiểm tra xem SQL có được log ra không
- Kiểm tra xem có lỗi syntax không

### 2. OrientDB connection
- Kiểm tra xem OrientDB có hoạt động không
- Kiểm tra xem có lỗi connection không

### 3. Cache issue
- Kiểm tra xem cache có hoạt động không
- Kiểm tra xem data có được cache đúng không

### 4. Async execution
- Kiểm tra xem view count có được tăng không đồng bộ không
- Kiểm tra xem có lỗi trong async operation không

## Debug commands

```bash
# 1. Kiểm tra food có tồn tại không
curl "http://localhost:3000/foods/rid/18:2214"

# 2. Kiểm tra view count hiện tại
curl "http://localhost:3000/foods/18:2214/view-count"

# 3. Test tăng view count thủ công
curl -X POST "http://localhost:3000/foods/18:2214/increment-view"

# 4. Kiểm tra view count sau khi tăng
curl "http://localhost:3000/foods/18:2214/view-count"

# 5. Gọi lại get detail để test auto increment
curl "http://localhost:3000/foods/rid/18:2214"

# 6. Kiểm tra view count sau khi gọi get detail
curl "http://localhost:3000/foods/18:2214/view-count"
```

## Expected Results

1. **First get detail call**: view_count = 0 → 1
2. **Manual increment**: view_count = 1 → 2  
3. **Second get detail call**: view_count = 2 → 3
4. **Cache hit**: view_count = 3 → 4

Nếu không thấy view count tăng, kiểm tra logs để xác định vấn đề.
