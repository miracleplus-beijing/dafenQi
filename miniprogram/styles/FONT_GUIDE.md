# 字体管理使用指南

## 📚 概述

本项目已统一字体管理，所有字体配置集中在 `styles/font.wxss` 文件中。

## 🎯 设计理念

- **统一管理**：所有字体在一个文件中配置，避免分散定义
- **CSS变量**：使用 CSS 变量管理，方便全局修改
- **工具类优先**：提供丰富的工具类，减少重复代码
- **PingFang SC 优先**：优先使用 PingFang SC 作为中文字体

## 📖 字体栈说明

### 1. 基础字体（推荐使用）
```css
--font-family-base: 'PingFang SC', 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Microsoft YaHei', sans-serif;
```
- 适用场景：大部分文本内容
- 优先级：PingFang SC（iOS/macOS）→ SF Pro Text（苹果系统）→ 系统字体 → 微软雅黑（Windows）

### 2. 中文字体
```css
--font-family-cn: 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', sans-serif;
```
- 适用场景：纯中文内容
- 优先级：PingFang SC → 微软雅黑 → 华文黑体

### 3. 英文字体
```css
--font-family-en: 'SF Pro Text', 'SF Pro', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
```
- 适用场景：纯英文内容

### 4. 标题字体
```css
--font-family-title: 'PingFang SC', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
```
- 适用场景：页面标题、章节标题

### 5. 等宽字体
```css
--font-family-mono: 'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace;
```
- 适用场景：代码、数字

## 🛠️ 使用方法

### 方法一：使用 CSS 变量（推荐）

```css
.my-text {
    font-family: var(--font-family-base);
    font-weight: var(--font-weight-medium);
    font-size: var(--font-size-lg);
}
```

### 方法二：使用工具类

#### 字体家族工具类
```html
<text class="font-base">基础字体</text>
<text class="font-title">标题字体</text>
<text class="font-cn">中文字体</text>
<text class="font-en">英文字体</text>
<text class="font-mono">等宽字体</text>
```

#### 字重工具类
```html
<text class="font-light">细体 300</text>
<text class="font-regular">常规 400</text>
<text class="font-medium">中等 500</text>
<text class="font-semibold">半粗 600</text>
<text class="font-bold">粗体 700</text>
```

#### 字号工具类
```html
<text class="text-xs">24rpx</text>
<text class="text-sm">28rpx</text>
<text class="text-base">32rpx</text>
<text class="text-lg">36rpx</text>
<text class="text-xl">40rpx</text>
<text class="text-2xl">44rpx</text>
<text class="text-3xl">48rpx</text>
```

### 方法三：使用组合样式类（最推荐）

```html
<!-- 页面标题 -->
<text class="page-title">这是页面标题</text>

<!-- 章节标题 -->
<text class="section-title">这是章节标题</text>

<!-- 正文 -->
<text class="body-text">这是正文内容</text>

<!-- 次要文本 -->
<text class="secondary-text">这是次要说明</text>

<!-- 小字说明 -->
<text class="caption-text">这是小字说明</text>

<!-- 按钮文本 -->
<text class="button-text">按钮</text>

<!-- 链接文本 -->
<text class="link-text">点击查看</text>
```

## 📝 最佳实践

### ✅ 推荐做法

1. **优先使用组合样式类**
```html
<text class="page-title">标题</text>
```

2. **需要自定义时使用 CSS 变量**
```css
.custom-text {
    font-family: var(--font-family-base);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-medium);
    color: #FF0000;
}
```

3. **简单场景使用工具类组合**
```html
<text class="font-base font-medium text-lg">自定义文本</text>
```

### ❌ 不推荐做法

1. **不要在页面样式中直接写 font-family**
```css
/* ❌ 错误 */
.my-text {
    font-family: 'PingFang SC', sans-serif;
}

/* ✅ 正确 */
.my-text {
    font-family: var(--font-family-base);
}
```

2. **不要硬编码字号和字重**
```css
/* ❌ 错误 */
.my-text {
    font-size: 32rpx;
    font-weight: 500;
}

/* ✅ 正确 */
.my-text {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
}
```

## 🔄 迁移指南

### 旧代码迁移

#### 迁移前
```css
.user-name {
    font-size: 40rpx;
    font-family: 'PingFang SC', 'SF Pro', sans-serif;
    font-weight: 500;
}
```

#### 迁移后（方式一：使用变量）
```css
.user-name {
    font-size: var(--font-size-xl);
    font-family: var(--font-family-base);
    font-weight: var(--font-weight-medium);
}
```

#### 迁移后（方式二：使用工具类）
```html
<text class="user-name font-base font-medium text-xl">用户名</text>
```

#### 迁移后（方式三：使用组合类）
```html
<text class="user-name section-title">用户名</text>
```
```css
.user-name {
    /* section-title 已包含字体、字号、字重 */
    /* 只需添加特殊样式 */
    margin-bottom: 8rpx;
}
```

## 🎨 实际应用示例

### Profile 页面示例

```html
<!-- 用户名 -->
<text class="user-name section-title">小齐00001</text>

<!-- 用户ID -->
<text class="user-id secondary-text">ID: 00001</text>

<!-- 菜单项 -->
<text class="menu-text body-text">我的收藏</text>

<!-- 退出按钮 -->
<text class="logout-text button-text" style="color: #FF3B30;">退出登录</text>
```

### 对应的 WXSS

```css
.user-name {
    /* 使用 section-title 组合类 */
    margin-bottom: 8rpx;
}

.user-id {
    /* 使用 secondary-text 组合类 */
    opacity: 0.75;
}

.menu-text {
    /* 使用 body-text 组合类 */
}

.logout-text {
    /* 使用 button-text 组合类，颜色单独设置 */
}
```

## 📊 变量速查表

### 字体家族
| 变量 | 值 | 用途 |
|-----|---|------|
| `--font-family-base` | PingFang SC, SF Pro Text... | 通用文本 |
| `--font-family-cn` | PingFang SC, Microsoft YaHei... | 中文文本 |
| `--font-family-en` | SF Pro Text, SF Pro... | 英文文本 |
| `--font-family-title` | PingFang SC, SF Pro Display... | 标题 |
| `--font-family-mono` | SF Mono, Menlo... | 代码/数字 |

### 字体重量
| 变量 | 值 | 描述 |
|-----|---|------|
| `--font-weight-light` | 300 | 细体 |
| `--font-weight-regular` | 400 | 常规 |
| `--font-weight-medium` | 500 | 中等 |
| `--font-weight-semibold` | 600 | 半粗 |
| `--font-weight-bold` | 700 | 粗体 |

### 字号
| 变量 | 值 | 描述 |
|-----|---|------|
| `--font-size-xs` | 24rpx | 超小 |
| `--font-size-sm` | 28rpx | 小 |
| `--font-size-base` | 32rpx | 基础 |
| `--font-size-lg` | 36rpx | 大 |
| `--font-size-xl` | 40rpx | 超大 |
| `--font-size-2xl` | 44rpx | 特大 |
| `--font-size-3xl` | 48rpx | 巨大 |

## 🔧 维护说明

### 如何修改全局字体

只需修改 `styles/font.wxss` 中的变量定义即可影响全局：

```css
page {
    /* 如果要换成其他中文字体，只需修改这里 */
    --font-family-cn: 'Source Han Sans CN', 'PingFang SC', sans-serif;
}
```

### 如何添加新的字号

```css
page {
    /* 添加新的字号变量 */
    --font-size-4xl: 52rpx;
}

/* 添加对应的工具类 */
.text-4xl {
    font-size: var(--font-size-4xl);
}
```

## 📞 常见问题

### Q: 为什么优先使用 PingFang SC？
A: PingFang SC 是苹果设计的中文字体，在 iOS 和 macOS 上显示效果最佳，且覆盖了大部分微信小程序用户。

### Q: Windows 用户看到的字体是什么？
A: Windows 用户会回退到 Microsoft YaHei（微软雅黑），显示效果也很好。

### Q: 可以自定义品牌字体吗？
A: 可以，在 `font.wxss` 中使用 `@font-face` 引入自定义字体文件即可。

### Q: 性能会受影响吗？
A: 不会。PingFang SC 是系统自带字体，无需下载。CSS 变量的性能开销可以忽略不计。

## 📌 总结

- 所有字体配置在 `styles/font.wxss`
- 优先使用组合样式类（如 `page-title`、`body-text`）
- 需要自定义时使用 CSS 变量（如 `var(--font-family-base)`）
- 避免直接写 `font-family`、`font-size`、`font-weight`
- 统一使用 PingFang SC 作为中文字体
