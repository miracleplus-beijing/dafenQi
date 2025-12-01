function formatSmartTime(dateStr) {
  console.log(`${dateStr} 进行格式化`)


  if (!dateStr) return '';

  // 1. 解析输入时间并转换为时间戳
  const inputDate = new Date(dateStr);
  const inputTs = inputDate.getTime();

  // 2. 获取当前时间戳
  const nowTs = Date.now();

  // 3. 定义东八区偏移量 (8小时 * 60分 * 60秒 * 1000毫秒)
  const offset = 8 * 60 * 60 * 1000;

  // 4. 将时间戳偏移到 UTC+8
  // 注意：这里是一个技巧，我们将时间手动拨快8小时，然后统一使用 getUTC... 方法读取
  // 这样无论手机处于哪个时区，读取到的都是 UTC+8 的“当地时间”数字
  const targetDate = new Date(inputTs + offset);
  const currentDate = new Date(nowTs + offset);

  // 5. 提取目标时间的年月日部分 (UTC视角即为东八区视角)
  const tYear = targetDate.getUTCFullYear();
  const tMonth = targetDate.getUTCMonth() + 1;
  const tDay = targetDate.getUTCDate();
  const tHour = targetDate.getUTCHours();
  const tMinute = targetDate.getUTCMinutes();

  // 6. 提取当前时间的年月日部分
  const cYear = currentDate.getUTCFullYear();
  const cMonth = currentDate.getUTCMonth() + 1;
  const cDay = currentDate.getUTCDate();

  // 辅助函数：补零
  const pad = n => n < 10 ? '0' + n : n;
  
  // 基础时间部分：HH:mm
  const timePart = `${pad(tHour)}:${pad(tMinute)}`;

  // 7. 逻辑判断
  // 规则1：如果是今天 -> 只显示时间
  if (tYear === cYear && tMonth === cMonth && tDay === cDay) {
    return timePart;
  }

  // 规则2：如果是今月（但不是今天）-> 不显示年月，显示 日+时间
  if (tYear === cYear && tMonth === cMonth) {
    return `${pad(tDay)}日 ${timePart}`;
  }

  // 规则3：如果是今年（但不是今月）-> 不显示年，显示 月-日+时间
  if (tYear === cYear) {
    return `${pad(tMonth)}-${pad(tDay)} ${timePart}`;
  }

  // 规则4：其他年份 -> 完整显示 年-月-日+时间
  return `${tYear}-${pad(tMonth)}-${pad(tDay)} ${timePart}`;
}

// 导出
module.exports = {
  formatSmartTime
}