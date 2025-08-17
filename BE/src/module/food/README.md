# Food Recommendation & Analytics API

## Tổng quan

Hệ thống gợi ý món ăn thông minh với các tính năng phân tích và thống kê nâng cao, được xây dựng trên NestJS và OrientDB.

## ⚠️ **Lưu ý quan trọng:**

### **Auto-increment View Count:**
- **Mỗi lần gọi `GET /foods/:rid` sẽ tự động tăng `view_count` lên 1**
- **Không cần gọi riêng endpoint để tăng view count**
- **View count được lưu trực tiếp trong property `view_count` của Food**

### **OrientDB @rid:**
- **Tất cả các API đều sử dụng `@rid` (Record ID) của OrientDB**
- **Không có field `id` riêng biệt**
- **Ví dụ: `#18:2212`, `#27:1`, `#30:1`**

### **⚠️ Vấn đề với # trong URL:**
- **Ký tự `#` trong URL được xử lý như fragment identifier của browser**
- **`#` KHÔNG được gửi đến server, khiến `rid` parameter bị trống**
- **Giải pháp: Sử dụng các endpoint alternative bên dưới**

### **🚀 Tối ưu hóa hiệu suất:**
- **In-memory caching:** Cache food data trong 5 phút
- **Synchronous view count:** Tăng view count đồng bộ để đảm bảo cập nhật
- **Optimized queries:** Chỉ select các field cần thiết
- **Cache invalidation:** Tự động xóa cache khi data thay đổi
- **Integrated view tracking:** View count được tăng tự động mỗi lần gọi get detail

## Các tính năng chính

### 1. Gợi ý món ăn từ lứa tuổi khác
**Endpoint:** `GET /food-recommendations/age-based?userAge=25`

**Mô tả:** Gợi ý món ăn từ những người độ tuổi khác để mở rộng khẩu vị.

**Response:**
```json
[
  {
    "foodRid": "#18:2212",
    "foodName": "Phở Bò",
    "reason": "Gợi ý từ lứa tuổi 30",
    "score": 0.8
  }
]
```

### 2. Gợi ý món ăn theo thể loại và khu vực
**Endpoint:** `GET /food-recommendations/category-region?userRegion=Hà Nội&categories=món chính,món phụ`

**Mô tả:** Hệ thống gợi ý theo nhóm thể loại ẩm thực yêu thích.

**Response:**
```json
[
  {
    "foodRid": "#18:2213",
    "foodName": "Bún Chả",
    "reason": "Món món chính từ Hà Nội",
    "score": 1.0
  }
]
```

### 3. Món ăn có lượt xem cao nhất
**Endpoint:** `GET /food-recommendations/most-viewed?limit=10`

**Mô tả:** Xác định món ăn được quan tâm nhất để phân tích xu hướng.

**Response:**
```json
[
  {
    "foodRid": "#18:2214",
    "foodName": "Phở Gà",
    "reason": "Lượt xem cao nhất - Top 1",
    "score": 1.0
  }
]
```

### 4. Thống kê theo loại món ăn
**Endpoint:** `GET /food-recommendations/statistics`

**Mô tả:** Giúp hệ thống đánh giá mức độ phổ biến của các loại.

**Response:**
```json
[
  {
    "foodType": "món chính",
    "totalLikes": 150,
    "totalViews": 500,
    "averageRating": 4.2
  }
]
```

### 5. Món ăn phổ biến theo độ tuổi
**Endpoint:** `GET /food-recommendations/popular-by-age`

**Mô tả:** Hiển thị đề xuất món ăn để gợi ý cho phần lớn người dùng app.

**Response:**
```json
[
  {
    "foodRid": "#18:2215",
    "foodName": "Cơm Tấm",
    "reason": "Phổ biến với 45 người dùng",
    "score": 0.95
  }
]
```

### 6. Gợi ý món ăn trong 2 bước
**Endpoint:** `GET /food-recommendations/within-2-steps/phở`

**Mô tả:** Gợi ý các món ăn khác loại hoặc vùng để đa dạng hóa gợi ý.

**Response:**
```json
[
  {
    "foodRid": "#18:2216",
    "foodName": "Bún Bò Huế",
    "reason": "Gợi ý liên quan đến phở",
    "score": 0.9
  }
]
```

### 7. Người dùng có ảnh hưởng cao nhất
**Endpoint:** `GET /food-recommendations/influential-users?limit=10`

**Mô tả:** Gợi ý người dùng tiềm năng có ảnh hưởng để upsell/marketing.

**Response:**
```json
[
  {
    "userRid": "#27:1",
    "userName": "Nguyễn Văn A",
    "countAction": 85,
    "region": "Hà Nội",
    "age": 28
  }
]
```

### 8. Gợi ý cá nhân hóa tổng hợp
**Endpoint:** `GET /food-recommendations/personalized?userRid=#27:1&userAge=25&userRegion=Hà Nội&categories=món chính,món phụ`

**Mô tả:** Tổng hợp tất cả các gợi ý cá nhân hóa cho user.

## CRUD Operations

### **Get Food Detail (Auto-increment View Count)**
**Endpoint:** `GET /foods/:rid`

**Mô tả:** Lấy chi tiết món ăn và **tự động tăng view_count lên 1 ngay lập tức**

**⚠️ Lưu ý:** Ký tự `#` trong URL có thể bị mất khi gửi đến server

**Alternative Endpoints:**
- `GET /foods/rid/18:2214` - Khi `#` bị mất
- `GET /foods/name/mực hấp gừng` - Tìm bằng tên món ăn

**🔄 View Count Behavior:**
- **Mỗi lần gọi API:** view_count tự động tăng +1
- **Synchronous update:** View count được cập nhật ngay lập tức
- **Cache sync:** Cache được cập nhật với view count mới
- **Error handling:** Nếu tăng view count thất bại, API sẽ fail

**Response:**
```json
{
  "@rid": "#18:2212",
  "name": "Phở Bò",
  "description": "Phở bò truyền thống",
  "type": "món chính",
  "ingredients": "bò, bánh phở, rau thơm",
  "recipe": "Nấu nước dùng, luộc bánh phở...",
  "image_url": "https://example.com/pho.jpg",
  "price": 45000,
  "view_count": 156
}
```

### **Get Food View Count**
**Endpoint:** `GET /foods/:rid/view-count`

**Mô tả:** Lấy số lượt xem của món ăn (không tăng view count)

**Response:**
```json
{
  "foodRid": "#18:2212",
  "viewCount": 156
}
```

### **Create Food**
**Endpoint:** `POST /foods`

**Mô tả:** Tạo món ăn mới với view_count = 0

**Request Body:**
```json
{
  "name": "Phở Bò",
  "description": "Phở bò truyền thống",
  "type": "món chính",
  "ingredients": "bò, bánh phở, rau thơm",
  "recipe": "Nấu nước dùng, luộc bánh phở...",
  "image_url": "https://example.com/pho.jpg",
  "price": 45000
}
```

### **Update Food**
**Endpoint:** `PUT /foods/:rid`

**Mô tả:** Cập nhật thông tin món ăn

**Request Body:**
```json
{
  "price": 50000,
  "description": "Mô tả mới"
}
```

### **Delete Food**
**Endpoint:** `DELETE /foods/:rid`

**Mô tả:** Xóa món ăn

**Response:**
```json
{
  "success": true,
  "message": "Food deleted successfully"
}
```

## Analytics & Thống kê

### 1. Phân tích xu hướng món ăn
**Endpoint:** `GET /food-analytics/trends?days=30`

**Response:**
```json
[
  {
    "foodName": "Phở Bò",
    "foodType": "món chính",
    "viewTrend": "increasing",
    "likeTrend": "stable",
    "popularityScore": 0.85,
    "regionDistribution": [
      { "region": "Hà Nội", "count": 1 }
    ]
  }
]
```

### 2. Phân tích hành vi người dùng
**Endpoint:** `GET /food-analytics/user-behavior/#27:1`

**Response:**
```json
{
  "userRid": "#27:1",
  "userName": "Nguyễn Văn A",
  "favoriteFoodTypes": ["món chính", "món phụ"],
  "preferredRegions": ["Hà Nội", "TP.HCM"],
  "activityLevel": "high",
  "influenceScore": 0.75
}
```

### 3. Ma trận tương tự món ăn
**Endpoint:** `GET /food-analytics/similarity/#18:2212`

**Response:**
```json
{
  "foodRid": "#18:2212",
  "foodName": "Phở Bò",
  "similarFoods": [
    {
      "foodRid": "#18:2213",
      "foodName": "Bún Bò Huế",
      "similarityScore": 0.8
    }
  ]
}
```

### 4. Gợi ý món ăn theo mùa
**Endpoint:** `GET /food-analytics/seasonal?season=summer`

**Response:**
```json
[
  {
    "foodRid": "#18:2217",
    "foodName": "Chè Hạt Sen",
    "foodType": "tráng miệng",
    "description": "Món chè mát mẻ cho mùa hè",
    "likeCount": 25
  }
]
```

### 5. Dashboard tổng hợp
**Endpoint:** `GET /food-analytics/dashboard`

**Response:**
```json
{
  "summary": {
    "totalFoods": 50,
    "increasingTrends": 35,
    "popularFoods": 20,
    "trendPercentage": 70
  },
  "trends": [...],
  "regionalStats": [...]
}
```

## Cách sử dụng

### 1. Khởi tạo service
```typescript
import { FoodRecommendationService } from './food-recommendation.service';
import { FoodAnalyticsService } from './food-analytics.service';

@Injectable()
export class YourService {
  constructor(
    private readonly foodRecService: FoodRecommendationService,
    private readonly foodAnalyticsService: FoodAnalyticsService,
  ) {}
}
```

### 2. Gọi API gợi ý
```typescript
// Gợi ý theo độ tuổi
const ageRecs = await this.foodRecService.getFoodsFromDifferentAgeGroups(25);

// Gợi ý theo thể loại và khu vực
const categoryRecs = await this.foodRecService.getFoodsByCategoryAndRegion(
  'Hà Nội', 
  ['món chính', 'món phụ']
);

// Gợi ý cá nhân hóa
const personalizedRecs = await this.foodRecService.getPersonalizedRecommendations(
  '#27:1', 25, 'Hà Nội', ['món chính']
);
```

### 3. Phân tích và thống kê
```typescript
// Phân tích xu hướng
const trends = await this.foodAnalyticsService.analyzeFoodTrends(30);

// Phân tích hành vi user
const userBehavior = await this.foodAnalyticsService.analyzeUserBehavior('#27:1');

// Ma trận tương tự
const similarity = await this.foodAnalyticsService.generateFoodSimilarityMatrix('#18:2212');
```

## Lưu ý

- **Mỗi lần gọi `GET /foods/:rid` sẽ tự động tăng view_count lên 1**
- **View count được tăng đồng bộ:** Đảm bảo cập nhật thành công trước khi trả về response
- **Cache được sync:** View count trong cache được cập nhật ngay lập tức
- **Error handling:** Nếu tăng view count thất bại, toàn bộ API sẽ fail
- **Tất cả các API đều sử dụng OrientDB @rid (Record ID)**
- **Không có field `id` riêng biệt**
- **⚠️ Ký tự `#` trong URL có thể bị mất - sử dụng endpoint alternative**
- **Các query được tối ưu hóa cho hiệu suất cao**
- **Hỗ trợ pagination và filtering**
- **Có validation và error handling đầy đủ**
- **Tích hợp với hệ thống authentication và authorization**

## Dependencies

- NestJS Framework
- OrientDB HTTP Client
- Class Validator
- Class Transformer