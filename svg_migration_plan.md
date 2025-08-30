# SVG图标命名规范和迁移计划

## 命名规范

采用英文命名，使用kebab-case格式，按功能分类：

### 导航类图标 (nav-*)
- `nav-browse.svg` - 漫游
- `nav-category.svg` - 分类  
- `nav-profile.svg` - 我的

### 播放控制类图标 (player-*)
- `player-play-large.svg` - 播放-大
- `player-play-small.svg` - 播放-小
- `player-pause.svg` - 暂停
- `player-forward-30s.svg` - 前进30秒
- `player-backward-15s.svg` - 后退15秒
- `player-progress-bar.svg` - 进度条

### 交互类图标 (action-*)
- `action-like-active.svg` - 点赞-已选择
- `action-like-inactive.svg` - 点赞-未选择
- `action-favorite-active.svg` - 收藏-已选择
- `action-favorite-inactive.svg` - 收藏-未选择
- `action-heart-active.svg` - 喜欢-已选择
- `action-heart-inactive.svg` - 喜欢-未选择
- `action-share.svg` - 分享
- `action-comment.svg` - 评论

### 界面控制类图标 (ui-*)
- `ui-back.svg` - 返回
- `ui-search.svg` - 搜索
- `ui-settings.svg` - 设置
- `ui-arrow-right.svg` - 向右箭头-选择
- `ui-refresh.svg` - 换一换
- `ui-expand.svg` - 查看完整榜单
- `ui-list.svg` - 列表图标
- `ui-loading.svg` - 加载动画

### 系统状态类图标 (system-*)
- `system-wifi.svg` - Wifi
- `system-battery.svg` - 电池电量
- `system-mobile-signal.svg` - Mobile Signal
- `system-home.svg` - Home
- `system-line.svg` - Line

### 功能页面类图标 (feature-*)
- `feature-history.svg` - 历史
- `feature-feedback.svg` - 问题反馈

### 登录相关图标 (auth-*)
- `auth-agreement-checked.svg` - 登录同意按钮-已同意
- `auth-agreement-unchecked.svg` - 登录同意按钮-空

## 文件映射表

| 原文件名 | 新文件名 | 用途说明 |
|----------|----------|----------|
| 漫游.svg | nav-browse.svg | 底部导航-漫游页面 |
| 分类.svg | nav-category.svg | 底部导航-分类页面 |
| 我的.svg | nav-profile.svg | 底部导航-个人页面 |
| 播放-大.svg | player-play-large.svg | 大型播放按钮 |
| 播放-小.svg | player-play-small.svg | 小型播放按钮 |
| 暂停.svg | player-pause.svg | 暂停按钮 |
| 前进30秒.svg | player-forward-30s.svg | 快进30秒 |
| 后退15秒.svg | player-backward-15s.svg | 快退15秒 |
| 进度条.svg | player-progress-bar.svg | 播放进度条 |
| 点赞-已选择.svg | action-like-active.svg | 已点赞状态 |
| 点赞-未选择.svg | action-like-inactive.svg | 未点赞状态 |
| 收藏-已选择.svg | action-favorite-active.svg | 已收藏状态 |
| 收藏-未选择.svg | action-favorite-inactive.svg | 未收藏状态 |
| 喜欢-已选择.svg | action-heart-active.svg | 已喜欢状态 |
| 喜欢-未选择.svg | action-heart-inactive.svg | 未喜欢状态 |
| 分享.svg | action-share.svg | 分享功能 |
| 评论.svg | action-comment.svg | 评论功能 |
| 返回.svg | ui-back.svg | 返回按钮 |
| 搜索.svg | ui-search.svg | 搜索功能 |
| 设置.svg | ui-settings.svg | 设置页面 |
| 向右箭头-选择.svg | ui-arrow-right.svg | 右箭头指示 |
| 换一换 icon.svg | ui-refresh.svg | 换一换功能 |
| 查看完整榜单-icon.svg | ui-expand.svg | 展开查看 |
| 列表图标.svg | ui-list.svg | 列表视图 |
| 加载动画.svg | ui-loading.svg | 加载状态 |
| Wifi.svg | system-wifi.svg | WiFi信号 |
| 电池电量.svg | system-battery.svg | 电池电量 |
| Mobile Signal.svg | system-mobile-signal.svg | 移动信号 |
| Home.svg | system-home.svg | 首页图标 |
| Line.svg | system-line.svg | 分割线 |
| Share.svg | system-share.svg | 系统分享 |
| 历史.svg | feature-history.svg | 历史记录 |
| 问题反馈.svg | feature-feedback.svg | 问题反馈 |
| 登录同意按钮-已同意.svg | auth-agreement-checked.svg | 同意条款-已选中 |
| 登录同意按钮-空.svg | auth-agreement-unchecked.svg | 同意条款-未选中 |