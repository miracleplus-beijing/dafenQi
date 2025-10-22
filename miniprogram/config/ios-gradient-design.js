/**
 * iOS风格渐变设计系统
 * 基于用户需求：淡蓝色，青色，单青色为主色调，低对比度，自然感强
 */

class iOSGradientDesign {
  constructor() {
    // 主色系：淡蓝色系渐变（符合用户需求）
    this.primaryGradients = {
      // 淡蓝色渐变
      lightBlue: {
        start: '#e0f2fe', // 淡蓝色起始
        end: '#bae6fd',   // 淡蓝色结束
        degrees: 135,
        name: '淡蓝色渐变'
      },

      // 青色渐变
      cyan: {
        start: '#cffafe', // 青色起始
        end: '#a5f3fc',   // 青色结束
        degrees: 135,
        name: '青色渐变'
      },

      // 单青色（用户特别要求）
      singleCyan: {
        start: '#22d3ee', // 单青色起始
        end: '#06b6d4',   // 单青色结束
        degrees: 135,
        name: '单青色渐变'
      },

      // 天空蓝渐变
      skyBlue: {
        start: '#dbeafe',
        end: '#bfdbfe',
        degrees: 135,
        name: '天空蓝渐变'
      },

      // 冰蓝渐变
      iceBlue: {
        start: '#f0f9ff',
        end: '#e0f2fe',
        degrees: 135,
        name: '冰蓝渐变'
      }
    }

    // 次要色系：自然感强的低对比度渐变
    this.secondaryGradients = {
      // 柔和绿色
      softGreen: {
        start: '#ecfdf5',
        end: '#d1fae5',
        degrees: 135,
        name: '柔和绿色'
      },

      // 温暖橙色
      warmOrange: {
        start: '#fff7ed',
        end: '#fed7aa',
        degrees: 135,
        name: '温暖橙色'
      },

      // 淡紫色
      lightPurple: {
        start: '#faf5ff',
        end: '#e879f9',
        degrees: 135,
        name: '淡紫色'
      },

      // 珍珠白
      pearlWhite: {
        start: '#ffffff',
        end: '#f8fafc',
        degrees: 135,
        name: '珍珠白'
      }
    }

    // 背景渐变系统
    this.backgroundGradients = {
      // 主背景 - 自然的蓝色系
      primary: {
        colors: ['#f0f9ff', '#e0f2fe', '#f8fafc'],
        degrees: 180,
        type: 'multi-stop'
      },

      // 卡片背景 - 玻璃拟态
      card: {
        base: 'rgba(255, 255, 255, 0.9)',
        backdrop: 'blur(20px)',
        border: 'rgba(255, 255, 255, 0.3)'
      },

      // 玻璃效果背景
      glass: {
        base: 'rgba(255, 255, 255, 0.7)',
        backdrop: 'blur(10px)',
        border: 'rgba(255, 255, 255, 0.2)'
      }
    }

    // 阴影系统 - iOS风格柔和阴影
    this.shadowSystem = {
      // 极轻阴影
      xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',

      // 轻微阴影
      sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',

      // 中等阴影
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',

      // 大阴影
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',

      // 玻璃阴影 - 特殊的iOS效果
      glass: '0 8px 32px 0 rgba(31, 38, 135, 0.1)',

      // 浮动阴影 - 用于交互状态
      floating: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
    }

    // 动画系统 - iOS风格的缓动函数
    this.animationSystem = {
      // iOS标准缓动
      ease: 'cubic-bezier(0.4, 0, 0.2, 1)',

      // 快速进入
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',

      // 快速退出
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',

      // 弹性动画
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',

      // 时长配置
      duration: {
        fast: '0.2s',
        normal: '0.3s',
        slow: '0.4s'
      }
    }
  }

  /**
   * 生成渐变CSS字符串
   * @param {Object} gradient - 渐变配置对象
   * @returns {string} CSS渐变字符串
   */
  generateGradientCSS(gradient) {
    if (gradient.type === 'multi-stop') {
      const stops = gradient.colors.map((color, index) => {
        const position = (index / (gradient.colors.length - 1)) * 100
        return `${color} ${position}%`
      }).join(', ')
      return `linear-gradient(${gradient.degrees}deg, ${stops})`
    }

    return `linear-gradient(${gradient.degrees}deg, ${gradient.start} 0%, ${gradient.end} 100%)`
  }

  /**
   * 获取主色系渐变
   * @param {string} name - 渐变名称
   * @returns {string} CSS渐变字符串
   */
  getPrimaryGradient(name) {
    const gradient = this.primaryGradients[name]
    return gradient ? this.generateGradientCSS(gradient) : null
  }

  /**
   * 获取随机主色系渐变（用于动态效果）
   * @returns {string} CSS渐变字符串
   */
  getRandomPrimaryGradient() {
    const keys = Object.keys(this.primaryGradients)
    const randomKey = keys[Math.floor(Math.random() * keys.length)]
    return this.getPrimaryGradient(randomKey)
  }

  /**
   * 生成完整的CSS变量定义
   * @returns {string} CSS变量字符串
   */
  generateCSSVariables() {
    let css = '/* iOS风格渐变设计系统 - CSS变量 */\npage {\n'

    // 主色系渐变
    Object.entries(this.primaryGradients).forEach(([key, gradient]) => {
      css += `  --gradient-${key}: ${this.generateGradientCSS(gradient)};\n`
    })

    // 次要色系渐变
    Object.entries(this.secondaryGradients).forEach(([key, gradient]) => {
      css += `  --gradient-${key}: ${this.generateGradientCSS(gradient)};\n`
    })

    // 背景渐变
    css += `  --bg-primary: ${this.generateGradientCSS(this.backgroundGradients.primary)};\n`
    css += `  --bg-card: ${this.backgroundGradients.card.base};\n`
    css += `  --bg-glass: ${this.backgroundGradients.glass.base};\n`

    // 阴影系统
    Object.entries(this.shadowSystem).forEach(([key, shadow]) => {
      css += `  --shadow-${key}: ${shadow};\n`
    })

    // 动画系统
    css += `  --ease: ${this.animationSystem.ease};\n`
    css += `  --ease-in: ${this.animationSystem.easeIn};\n`
    css += `  --ease-out: ${this.animationSystem.easeOut};\n`
    css += `  --bounce: ${this.animationSystem.bounce};\n`

    css += '}\n'
    return css
  }

  /**
   * 获取学术分类的渐变配色方案
   * @returns {Array} 7个渐变配置数组
   */
  getAcademicCategoryGradients() {
    return [
      this.primaryGradients.lightBlue,    // CS.AI - 淡蓝色
      this.primaryGradients.cyan,         // CS.CL - 青色
      this.primaryGradients.singleCyan,   // CS.CV - 单青色
      this.primaryGradients.skyBlue,      // CS.LG - 天空蓝
      this.primaryGradients.iceBlue,      // CS.NE - 冰蓝
      this.secondaryGradients.softGreen,  // CS.RO - 柔和绿色
      this.secondaryGradients.pearlWhite  // STAT.ML - 珍珠白
    ]
  }
}

// 创建单例实例并导出
const gradientDesignInstance = new iOSGradientDesign()

module.exports = gradientDesignInstance