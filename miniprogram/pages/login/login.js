// 登录页面逻辑
const app = getApp()
const authService = require('../../services/auth.service.js')

Page({
  data: {
    // 是否同意协议
    isAgreed: false,
    
    // 登录状态
    isLogging: false,
    
    // 是否显示用户信息完善界面
    showUserInfoForm: false,
    
    // 微信版本兼容性
    isChooseAvatarSupported: true,
    
    // 用户基础信息
    avatarUrl: '',
    userName: '',
    nickName: '',
    
    // 学术信息
    orcid: '',
    email: '',
    githubUrl: '',
    personalWebsite: '',
    
    // 机构相关
    institution: '',
    institutionCustom: '',
    institutionIndex: 0,
    showCustomInstitution: false,
    institutionOptions: [], // 将从后端加载
    
    // 研究领域相关
    researchFields: [],
    researchFieldIndexes: [0, 0],
    researchFieldColumns: [[], []], // 二级联动数据
    selectedResearchFieldsText: '',
    
    // 验证错误信息
    emailError: '',
    orcidError: '',
    githubUrlError: '',
    websiteUrlError: ''
  },

  onLoad: function (options) {
    console.log('登录页面加载', options)
    
    // 设置隐私授权被动监听
    this.setupPrivacyAuthorization()
    
    // 检查微信版本兼容性
    this.checkWechatVersion()
    
    // 加载机构和研究领域数据
    this.loadAcademicData()
  },

  // 检查微信版本兼容性
  checkWechatVersion: function() {
    try {
      const systemInfo = wx.getSystemInfoSync()
      const SDKVersion = systemInfo.SDKVersion || '1.0.0'
      
      console.log('当前微信SDK版本:', SDKVersion)
      
      // 检查chooseAvatar API的兼容性（需要2.21.2以上版本）
      if (this.compareVersion(SDKVersion, '2.21.2') < 0) {
        console.warn('微信版本过低，头像选择功能可能不可用')
        this.setData({
          isChooseAvatarSupported: false
        })
      } else {
        this.setData({
          isChooseAvatarSupported: true
        })
      }
      
      // 特别处理已知有问题的版本
      if (SDKVersion !== '2.25.0' && this.compareVersion(SDKVersion, '2.21.2') >= 0) {
        console.warn('当前版本可能存在chooseAvatar兼容性问题，建议升级到2.25.0')
      }
    } catch (error) {
      console.error('版本检查失败:', error)
      this.setData({
        isChooseAvatarSupported: true // 默认支持
      })
    }
  },




  // 设置隐私授权被动监听
  setupPrivacyAuthorization: function() {
    // 只在支持的版本中设置监听
    const systemInfo = wx.getSystemInfoSync()
    const SDKVersion = systemInfo.SDKVersion || '1.0.0'
    
    if (this.compareVersion(SDKVersion, '2.32.3') >= 0) {
      try {
        wx.onNeedPrivacyAuthorization((resolve, eventInfo) => {
          console.log('触发隐私授权事件, 接口:', eventInfo.referrer)
          
          // 弹出隐私同意框
          wx.showModal({
            title: '隐私保护提示',
            content: '感谢您使用达芬Qi说！我们需要获取您的头像信息用于完善个人资料。请点击"同意"继续使用，或查看完整的隐私政策。',
            confirmText: '同意',
            cancelText: '拒绝',
            success: (res) => {
              if (res.confirm) {
                // 用户同意
                resolve({ 
                  buttonId: 'privacy-auth-button', 
                  event: 'agree' 
                })
              } else {
                // 用户拒绝
                resolve({ 
                  buttonId: 'privacy-auth-button', 
                  event: 'disagree' 
                })
                wx.showToast({
                  title: '已取消头像选择',
                  icon: 'none'
                })
              }
            }
          })
        })
      } catch (error) {
        console.error('设置隐私授权监听失败:', error)
      }
    }
  },

  // 版本比较函数
  compareVersion: function(version1, version2) {
    const v1 = version1.split('.')
    const v2 = version2.split('.')
    const len = Math.max(v1.length, v2.length)

    while (v1.length < len) {
      v1.push('0')
    }
    while (v2.length < len) {
      v2.push('0')
    }

    for (let i = 0; i < len; i++) {
      const num1 = parseInt(v1[i])
      const num2 = parseInt(v2[i])

      if (num1 > num2) {
        return 1
      } else if (num1 < num2) {
        return -1
      }
    }

    return 0
  },

  onShow: function () {
    console.log('登录页面显示')
    
    // 移除自动跳转逻辑，始终显示未登录界面
    // 用户可以选择重新登录或使用其他登录方式
  },

  // 切换协议同意状态
  toggleAgreement: function() {
    this.setData({
      isAgreed: !this.data.isAgreed
    })
  },

  // 微信登录（符合微信官方最新规范）
  async handleWechatLogin() {
    if (!this.data.isAgreed) {
      wx.showModal({
        title: '提示',
        content: '请先同意《用户协议》和《隐私政策》',
        showCancel: false,
        confirmText: '我知道了'
      })
      return
    }

    if (this.data.isLogging) return

    this.setData({
      isLogging: true
    })

    try {
      wx.showLoading({
        title: '登录中...'
      })

      // 使用微信登录（仅获取openid）
      const loginResult = await authService.loginWithWechat()

      if (loginResult.success) {
        // 登录成功，检查用户信息是否完整
        const user = loginResult.user
        if (!user.has_user_info || user.nickname === '微信用户' || !user.avatar_url || user.avatar_url.includes('default-avatar')) {
          // 需要完善用户信息，使用微信最新的头像昵称填写组件
          await this.showUserInfoFormWithLatestAPI(user)
        } else {
          // 用户信息已完整，直接登录成功
          this.loginSuccess(user)
        }
      } else {
        this.loginFailed(loginResult.error)
      }

    } catch (error) {
      console.error('登录失败:', error)
      this.loginFailed('登录失败，请重试')
    }
  },

  // 使用最新的微信API显示用户信息完善表单
  async showUserInfoFormWithLatestAPI(user) {
    const existingFields = user.academic_field && user.academic_field.fields ? user.academic_field.fields : []
    
    // 检查用户是否已有授权信息
    let initialAvatarUrl = 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/icons/nav-profile.svg'
    let initialNickName = ''

    try {
      // 检查是否有用户信息授权
      const settingResult = await new Promise((resolve, reject) => {
        wx.getSetting({
          success: resolve,
          fail: reject
        })
      })

      if (settingResult.authSetting['scope.userInfo']) {
        // 已经授权，可以直接调用 getUserInfo 获取头像昵称
        try {
          const userInfoResult = await new Promise((resolve, reject) => {
            wx.getUserInfo({
              success: resolve,
              fail: reject
            })
          })
          
          console.log('用户信息', userInfoResult.userInfo)
          initialAvatarUrl = userInfoResult.userInfo.avatarUrl || initialAvatarUrl
          initialNickName = userInfoResult.userInfo.nickName !== '微信用户' ? userInfoResult.userInfo.nickName : ''
          
          wx.showToast({
            title: '已获取用户信息',
            icon: 'success',
            duration: 2000
          })
        } catch (error) {
          console.log('获取用户信息失败，使用默认值:', error)
        }
      }
    } catch (error) {
      console.log('检查授权失败，使用默认值:', error)
    }

    // 显示完善信息表单，预填已获取的信息
    this.setData({
      showUserInfoForm: true,
      isLogging: false,
      avatarUrl: user.avatar_url || initialAvatarUrl,
      userName: initialNickName || user.username || '',
      nickName: initialNickName || (user.nickname === '微信用户' ? '' : (user.nickname || '')),
      orcid: user.orcid || '',
      researchFields: existingFields
    })
    wx.hideLoading()
    
    wx.showModal({
      title: '完善资料',
      content: '为了更好的体验，请完善您的个人信息和学术背景。您可以点击头像选择新头像，在昵称框中输入您的昵称。',
      confirmText: '去设置',
      cancelText: '跳过',
      success: (res) => {
        if (!res.confirm) {
          // 用户选择跳过
          this.skipUserInfo()
        }
      }
    })
  },

  // 选择头像（使用微信官方头像选择组件）
  onChooseAvatar(e) {
    try {
      console.log('头像选择事件:', e.detail)
      
      const { avatarUrl } = e.detail
      if (!avatarUrl) {
        wx.showToast({
          title: '头像获取失败，请重试',
          icon: 'none'
        })
        return
      }

      // 检查是否是有效的头像路径
      if (!avatarUrl.includes('tmp') && !avatarUrl.includes('temp') && !avatarUrl.includes('wxfile://') && !avatarUrl.includes('qlogo.cn')) {
        wx.showToast({
          title: '无效的头像文件',
          icon: 'none'
        })
        return
      }

      wx.showToast({
        title: '头像已选择',
        icon: 'success'
      })

      this.setData({
        avatarUrl
      })
    } catch (error) {
      console.error('头像选择失败:', error)
      wx.showToast({
        title: '头像选择失败，请重试',
        icon: 'none'
      })
    }
  },

  // 输入用户名
  bindUserNameInput(e) {
    this.setData({
      userName: e.detail.value
    })
  },

  // 输入框点击事件（用户手动输入昵称提示）
  onUserNameFocus() {
    // 不再显示误导性的"获取微信昵称"提示，而是引导用户手动输入
    wx.showToast({
      title: '请输入您的昵称',
      icon: 'none',
      duration: 2000
    })
  },

  // 处理用户昵称输入（兼容最新微信规范）
  bindNicknameInput(e) {
    const nickname = e.detail.value
    this.setData({
      userName: nickname,
      nickName: nickname
    })
  },

  // 加载学术数据（机构和研究领域）
  async loadAcademicData() {
    try {
      // 加载机构数据
      const institutionResult = await this.loadInstitutions()
      // 加载研究领域数据
      const fieldResult = await this.loadResearchFields()
      
      if (institutionResult.success && fieldResult.success) {
        this.setData({
          institutionOptions: institutionResult.data,
          researchFieldColumns: fieldResult.data
        })
      }
    } catch (error) {
      console.error('加载学术数据失败:', error)
    }
  },

  // 加载机构列表
  async loadInstitutions() {
    return new Promise((resolve) => {
      wx.request({
        url: `${app.globalData.supabaseUrl}/rest/v1/institutions?order=name_zh.asc`,
        method: 'GET',
        header: {
          'apikey': app.globalData.supabaseAnonKey,
          'Authorization': `Bearer ${app.globalData.supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve({ success: true, data: res.data })
          } else {
            resolve({ success: false, error: '加载机构数据失败' })
          }
        },
        fail: () => resolve({ success: false, error: '网络错误' })
      })
    })
  },

  // 加载研究领域列表
  async loadResearchFields() {
    return new Promise((resolve) => {
      wx.request({
        url: `${app.globalData.supabaseUrl}/rest/v1/research_fields?order=level.asc,name_zh.asc`,
        method: 'GET', 
        header: {
          'apikey': app.globalData.supabaseAnonKey,
          'Authorization': `Bearer ${app.globalData.supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        success: (res) => {
          if (res.statusCode === 200) {
            // 构建二级联动数据结构
            const fields = res.data
            const level1 = fields.filter(f => f.level === 1)
            const level2 = fields.filter(f => f.level === 2)
            
            // 第一列：一级领域
            const firstColumn = level1
            // 第二列：对应的二级领域
            const secondColumn = level2.filter(f => f.parent_code === level1[0]?.code)
            
            resolve({ 
              success: true, 
              data: [firstColumn, secondColumn],
              allFields: fields
            })
          } else {
            resolve({ success: false, error: '加载研究领域数据失败' })
          }
        },
        fail: () => resolve({ success: false, error: '网络错误' })
      })
    })
  },

  // 输入ORCID（去掉前缀显示）
  bindOrcidInput(e) {
    let orcid = e.detail.value
    // 格式化ORCID：自动添加连字符
    orcid = orcid.replace(/[^0-9X]/g, '') // 只保留数字和X
    if (orcid.length > 0) {
      orcid = orcid.match(/.{1,4}/g).join('-')
      if (orcid.length > 19) {
        orcid = orcid.substring(0, 19)
      }
    }
    
    this.setData({
      orcid: orcid,
      orcidError: '' // 清除错误信息
    })
  },

  // 机构选择变化
  bindInstitutionChange(e) {
    const index = e.detail.value
    const institution = this.data.institutionOptions[index]
    
    this.setData({
      institutionIndex: index,
      institution: institution.code,
      showCustomInstitution: institution.code === 'OTHER'
    })
  },

  // 自定义机构输入
  bindInstitutionCustomInput(e) {
    this.setData({
      institutionCustom: e.detail.value
    })
  },

  // 研究领域选择变化
  bindResearchFieldChange(e) {
    const indexes = e.detail.value
    const level1Index = indexes[0]
    const level2Index = indexes[1]
    
    const level1Field = this.data.researchFieldColumns[0][level1Index]
    const level2Field = this.data.researchFieldColumns[1][level2Index]
    
    // 更新选中的研究领域
    const selectedFields = []
    if (level1Field) selectedFields.push(level1Field.code)
    if (level2Field) selectedFields.push(level2Field.code)
    
    // 构建显示文本
    const displayText = selectedFields.length > 0 
      ? `${level1Field?.name_zh || ''}${level2Field ? ' > ' + level2Field.name_zh : ''}`
      : ''
    
    this.setData({
      researchFieldIndexes: indexes,
      researchFields: selectedFields,
      selectedResearchFieldsText: displayText
    })
  },

  // 研究领域列变化（二级联动）
  bindResearchFieldColumnChange(e) {
    const column = e.detail.column
    const index = e.detail.value
    
    if (column === 0) {
      // 第一列变化，更新第二列数据
      const level1Field = this.data.researchFieldColumns[0][index]
      if (level1Field) {
        // 加载对应的二级领域
        this.updateSecondColumn(level1Field.code)
      }
    }
  },

  // 更新第二列数据
  async updateSecondColumn(parentCode) {
    try {
      const result = await this.loadResearchFields()
      if (result.success) {
        const level2Fields = result.allFields.filter(f => 
          f.level === 2 && f.parent_code === parentCode
        )
        
        const newColumns = [this.data.researchFieldColumns[0], level2Fields]
        const newIndexes = [this.data.researchFieldIndexes[0], 0]
        
        this.setData({
          researchFieldColumns: newColumns,
          researchFieldIndexes: newIndexes
        })
      }
    } catch (error) {
      console.error('更新研究领域失败:', error)
    }
  },

  // 邮箱输入
  bindEmailInput(e) {
    this.setData({
      email: e.detail.value,
      emailError: '' // 清除错误信息
    })
  },

  // GitHub URL输入
  bindGithubUrlInput(e) {
    this.setData({
      githubUrl: e.detail.value,
      githubUrlError: '' // 清除错误信息
    })
  },

  // 个人网站输入
  bindPersonalWebsiteInput(e) {
    this.setData({
      personalWebsite: e.detail.value,
      websiteUrlError: '' // 清除错误信息
    })
  },

  // 完善用户信息
  async completeUserInfo() {
    // 基础验证
    if (!this.data.userName) {
      wx.showToast({
        title: '请填写用户名',
        icon: 'none'
      })
      return
    }

    // 学术信息验证
    const validationErrors = this.validateAcademicForm()
    if (validationErrors.length > 0) {
      wx.showToast({
        title: validationErrors[0],
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({
        title: '更新资料中...'
      })

      // 构建用户信息对象
      const userInfo = {
        avatarUrl: this.data.avatarUrl,
        username: this.data.userName,
        nickname: this.data.userName, // 使用用户名作为昵称
        
        // 新增学术信息字段
        institution: this.data.institution,
        institution_custom: this.data.institutionCustom,
        email: this.data.email,
        orcid: this.data.orcid,
        github_url: this.data.githubUrl,
        personal_website: this.data.personalWebsite,
        
        // 保持研究领域的现有格式
        academic_field: this.data.researchFields.length > 0 ? 
          { fields: this.data.researchFields } : null
      }

      // 更新用户信息
      const result = await authService.updateUserInfo(userInfo)

      if (result.success) {
        this.setData({
          showUserInfoForm: false
        })
        this.loginSuccess(result.user)
      } else {
        wx.showToast({
          title: result.error || '更新失败，请重试',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('更新用户信息失败:', error)
      wx.showToast({
        title: '更新失败，请重试',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 验证邮箱格式
  validateEmailFormat(e) {
    const email = e.detail.value || this.data.email
    if (email && !this.validateEmail(email)) {
      this.setData({
        emailError: '邮箱格式不正确'
      })
    } else {
      this.setData({
        emailError: ''
      })
    }
  },

  // 验证ORCID格式  
  validateOrcidFormat(e) {
    const orcid = e.detail.value || this.data.orcid
    if (orcid && !this.validateOrcid(orcid)) {
      this.setData({
        orcidError: 'ORCID格式不正确，应为：0000-0000-0000-0000'
      })
    } else {
      this.setData({
        orcidError: ''
      })
    }
  },

  // 验证GitHub URL格式
  validateGithubUrlFormat(e) {
    const url = e.detail.value || this.data.githubUrl
    if (url && !this.validateGithubUrl(url)) {
      this.setData({
        githubUrlError: 'GitHub地址格式不正确'
      })
    } else {
      this.setData({
        githubUrlError: ''
      })
    }
  },

  // 验证个人网站URL格式
  validateWebsiteUrlFormat(e) {
    const url = e.detail.value || this.data.personalWebsite
    if (url && !this.validateUrl(url)) {
      this.setData({
        websiteUrlError: '网站地址格式不正确'
      })
    } else {
      this.setData({
        websiteUrlError: ''
      })
    }
  },

  // 邮箱格式验证
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  // ORCID验证（保留现有逻辑）
  validateOrcid(orcid) {
    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/
    return orcidRegex.test(orcid)
  },

  // URL格式验证
  validateUrl(url) {
    const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/
    return urlRegex.test(url)
  },

  // GitHub地址专门验证
  validateGithubUrl(url) {
    const githubRegex = /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_-]+\/?$/
    return githubRegex.test(url)
  },

  // 表单提交验证
  validateAcademicForm() {
    const errors = []
    
    // 邮箱验证（如果填写了）
    if (this.data.email && !this.validateEmail(this.data.email)) {
      errors.push('邮箱格式不正确')
    }
    
    // ORCID验证（如果填写了）
    if (this.data.orcid && !this.validateOrcid(this.data.orcid)) {
      errors.push('ORCID格式不正确')
    }
    
    // GitHub URL验证（如果填写了）
    if (this.data.githubUrl && !this.validateGithubUrl(this.data.githubUrl)) {
      errors.push('GitHub地址格式不正确')
    }
    
    // 个人主页URL验证（如果填写了）
    if (this.data.personalWebsite && !this.validateUrl(this.data.personalWebsite)) {
      errors.push('个人主页地址格式不正确')
    }
    
    return errors
  },

  // 跳过完善信息
  skipUserInfo() {
    this.setData({
      showUserInfoForm: false
    })
    // 使用默认信息继续登录
    const currentUser = authService.getCurrentUser()
    this.loginSuccess(currentUser)
  },

  // 登录成功处理
  loginSuccess: function(user) {
    wx.hideLoading()
    
    this.setData({
      isLogging: false
    })

    // 格式化用户信息以确保兼容性
    const formattedUser = {
      ...user,
      nickName: user.nickname || user.nickName || user.username || '微信用户',
      avatarUrl: user.avatar_url || user.avatarUrl || 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/icons/nav-profile.svg'
    }

    // 更新全局状态
    app.globalData.userInfo = formattedUser
    app.globalData.isLoggedIn = true

    // 确保保存到本地存储
    try {
      wx.setStorageSync('userInfo', formattedUser)
    } catch (error) {
      console.error('保存用户信息到本地失败:', error)
    }

    wx.showToast({
      title: '登录成功',
      icon: 'success',
      duration: 1500,
      success: () => {
        // 延迟返回
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    })

    console.log('登录成功', formattedUser)
  },

  // 登录失败
  loginFailed: function(message) {
    wx.hideLoading()
    
    this.setData({
      isLogging: false
    })

    wx.showToast({
      title: message || '登录失败',
      icon: 'none',
      duration: 2000
    })
  },

  // 手机号快速验证
  async getPhoneNumber(e) {
    if (!e.detail.code) {
      wx.showToast({
        title: '获取手机号失败',
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({
        title: '验证手机号...'
      })

      const result = await authService.verifyPhoneNumber(e.detail.code)
      
      if (result.success) {
        // 更新用户信息
        if (app.globalData.userInfo) {
          app.globalData.userInfo.phoneNumber = result.phoneNumber
          wx.setStorageSync('userInfo', app.globalData.userInfo)
        }
        
        wx.showToast({
          title: '手机号验证成功',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: result.error || '手机号验证失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('手机号验证失败:', error)
      wx.showToast({
        title: '验证失败，请重试',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 邮箱登录
  handleEmailLogin: function() {
    if (!this.data.isAgreed) {
      wx.showToast({
        title: '请先同意用户协议',
        icon: 'none',
        duration: 2000
      })
      return
    }

    wx.showToast({
      title: '邮箱登录功能开发中',
      icon: 'none',
      duration: 2000
    })
  },

  // 游客模式
  handleGuestMode: function() {
    wx.showModal({
      title: '游客模式',
      content: '游客模式下部分功能将受限，确定继续吗？',
      confirmText: '继续',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 设置游客模式
          app.globalData.isGuestMode = true
          
          wx.showToast({
            title: '已进入游客模式',
            icon: 'success',
            duration: 1500,
            success: () => {
              setTimeout(() => {
                wx.navigateBack()
              }, 1500)
            }
          })
        }
      }
    })
  },

  // 显示用户协议
  showUserAgreement: function() {
    wx.showModal({
      title: '用户协议',
      content: '这里是用户协议的内容...\n\n1. 用户须遵守相关法律法规\n2. 不得发布违法违规内容\n3. 尊重他人知识产权\n4. 保护个人隐私信息',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 显示隐私政策
  showPrivacyPolicy: function() {
    // 调用微信官方隐私协议
    wx.openPrivacyContract({
      success: () => {
        console.log('打开隐私协议成功')
      },
      fail: (error) => {
        console.error('打开隐私协议失败:', error)
        // 如果打开失败，显示本地版本
        wx.showModal({
          title: '隐私政策',
          content: '我们非常重视您的隐私保护和个人信息安全。\n\n收集的信息包括：\n• 微信昵称和头像\n• 设备信息\n• 操作日志\n• 位置信息等\n\n用于提供个性化服务和改善用户体验。',
          showCancel: false,
          confirmText: '我知道了'
        })
      }
    })
  },





  // 分享功能
  onShareAppMessage: function() {
    return {
      title: '达芬Qi说 - 听见学术的声音',
      path: '/pages/login/login',
      imageUrl: '/images/icons/share-cover.jpg'
    }
  }
})