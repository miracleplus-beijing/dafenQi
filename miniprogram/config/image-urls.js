/**
 * 图片URL映射配置
 * 将本地路径映射到Supabase CDN URL
 */

const SUPABASE_BASE_URL =
  'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images';

// 图片URL映射表
const imageUrls = {
  // 播放控制图标
  'icons/播放-大.svg': `${SUPABASE_BASE_URL}/icons/play-large.svg`,
  'icons/暂停.svg': `${SUPABASE_BASE_URL}/icons/pause.svg`,
  'icons/play-small.svg': `${SUPABASE_BASE_URL}/icons/play-small.svg`,

  // 交互图标
  'icons/收藏-已选择.svg': `${SUPABASE_BASE_URL}/icons/favorite-selected.svg`,
  'icons/收藏-未选择.svg': `${SUPABASE_BASE_URL}/icons/favorite-unselected.svg`,
  'icons/喜欢-已选择.svg': `${SUPABASE_BASE_URL}/icons/like-selected.svg`,
  'icons/喜欢-未选择.svg': `${SUPABASE_BASE_URL}/icons/like-unselected.svg`,
  'icons/点赞-已选择.svg': `${SUPABASE_BASE_URL}/icons/thumbs-up-selected.svg`,
  'icons/点赞-未选择.svg': `${SUPABASE_BASE_URL}/icons/thumbs-up-unselected.svg`,

  // 导航图标
  'icons/分类.svg': `${SUPABASE_BASE_URL}/icons/category.svg`,
  'icons/category.png': `${SUPABASE_BASE_URL}/icons/category.png`,
  'icons/browse.svg': `${SUPABASE_BASE_URL}/icons/browse.svg`,
  'icons/browse.png': `${SUPABASE_BASE_URL}/icons/browse.png`,
  'icons/user.svg': `${SUPABASE_BASE_URL}/icons/profile.svg`,
  'icons/user.png': `${SUPABASE_BASE_URL}/icons/profile.png`,

  // 功能图标
  'icons/search.svg': `${SUPABASE_BASE_URL}/icons/search.svg`,
  'icons/认知.svg': `${SUPABASE_BASE_URL}/icons/insight.svg`,
  'icons/分享.svg': `${SUPABASE_BASE_URL}/icons/share.svg`,
  'icons/settings.svg': `${SUPABASE_BASE_URL}/icons/settings.svg`,
  'icons/history.svg': `${SUPABASE_BASE_URL}/icons/history.svg`,
  'icons/feedback.svg': `${SUPABASE_BASE_URL}/icons/feedback.svg`,

  // 播放控制扩展
  'icons/前进30秒.svg': `${SUPABASE_BASE_URL}/icons/backward-15s.svg`,
  'icons/后退15秒.svg': `${SUPABASE_BASE_URL}/icons/backward-15s.svg`,
  'icons/progress-bar.svg': `${SUPABASE_BASE_URL}/icons/progress-bar.svg`,

  // 大图片资源
  'ChatGPT Podcast Image.png': `${SUPABASE_BASE_URL}/large/ChatGPT Podcast Image.png`,
  'CS.AI Logo - Artificial Intelligence.png': `${SUPABASE_BASE_URL}/CS-AI-Logo.png`,
  'CS.CV Logo - Computer Vision.png': `${SUPABASE_BASE_URL}/large/CS.CV Logo - Computer Vision.png`,
  'CS.LG Logo - Learning.png': `${SUPABASE_BASE_URL}/large/CS.LG Logo - Learning.png`,
  'CS.RO Logo - Robotics.png': `${SUPABASE_BASE_URL}/large/CS.RO Logo - Robotics.png`,
  'CS.SD Logo - Sound Processing.png': `${SUPABASE_BASE_URL}/large/CS.SD Logo - Sound Processing.png`,
  'CS.CL Logo - Computational Linguistics.png': `${SUPABASE_BASE_URL}/large/CS.CL Logo - Computational Linguistics.png`,
  'CS.MA Logo - Multi-Agent Systems.png': `${SUPABASE_BASE_URL}/large/CS.MA Logo - Multi-Agent Systems.png`,

  // 其他资源
  'icons/logo.png': `${SUPABASE_BASE_URL}/icons/logo.png`,
  'icons/avatar.png': `${SUPABASE_BASE_URL}/icons/avatar.png`,
  'MiracclePlus头像.png': `${SUPABASE_BASE_URL}/assets/MiracclePlus头像.png`,
  'Science论文封面.png': `${SUPABASE_BASE_URL}/assets/Science论文封面.png`,
  'Science论文封面2.png': `${SUPABASE_BASE_URL}/assets/Science论文封面2.png`,
};

/**
 * 获取CDN图片URL
 * @param {string} localPath - 本地图片路径
 * @param {string} fallback - 降级方案路径
 * @returns {string} CDN URL或本地路径
 */
function getImageUrl(localPath, fallback = null) {
  // 清理路径
  const cleanPath = localPath
    .replace(/^.*[\\/]images[\\/]/, '') // 原先是 [\\\/]，去掉多余的 \
    .replace(/^images[\\/]/, ''); // 原先是 [\\\/]，去掉多余的 \
  // 查找映射
  if (imageUrls[cleanPath]) {
    return imageUrls[cleanPath];
  }

  // 通用映射规则
  if (cleanPath.startsWith('icons/')) {
    const fileName = cleanPath.replace('icons/', '');
    return `${SUPABASE_BASE_URL}/icons/${fileName}`;
  }

  // 返回降级方案或原路径
  return fallback || localPath;
}

/**
 * 批量预加载关键图片
 * @returns {Promise} 预加载Promise
 */
async function preloadCriticalImages() {
  const criticalImages = [
    'icons/播放-大.svg',
    'icons/暂停.svg',
    'icons/收藏-已选择.svg',
    'icons/收藏-未选择.svg',
    'icons/喜欢-已选择.svg',
    'icons/喜欢-未选择.svg',
  ];

  const preloadPromises = criticalImages.map(imagePath => {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(imagePath);
      img.onerror = () => resolve(imagePath); // 即使失败也继续
      img.src = getImageUrl(imagePath);
    });
  });

  try {
    await Promise.all(preloadPromises);
    console.log('✅ 关键图片预加载完成');
  } catch (error) {
    console.warn('图片预加载部分失败:', error);
  }
}

module.exports = {
  getImageUrl,
  preloadCriticalImages,
  imageUrls,
  SUPABASE_BASE_URL,
};
