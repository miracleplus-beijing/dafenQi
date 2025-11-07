import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
};
// WeChat configuration - move to environment variables in production
const WECHAT_CONFIG = {
  APPID: 'wxdfbf85ea64f424da',
  SECRET: '72c584803598fabb0641b2b6f436d837'
};
Deno.serve(async (req)=>{
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const { code, userInfo, refresh_token } = await req.json();
    console.log('Received auth request:', {
      code: code?.substring ? code.substring(0, 8) + '...' : code,
      hasUserInfo: !!userInfo,
      hasRefreshToken: !!refresh_token,
      isRefresh: code === 'refresh_session',
      isUpdate: code === 'update_user_info'
    });
    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    // Handle user info update
    if (code === 'update_user_info') {
      console.log('Processing user info update request...', userInfo);
      const authHeader = req.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Missing or invalid authorization header');
      }
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: verifyError } = await supabaseAdmin.auth.getUser(token);
      if (verifyError || !user) {
        throw new Error(`Invalid token: ${verifyError?.message}`);
      }
      console.log('Updating user info for user:', user.id);
      const updateData = {
        user_metadata: {
          ...user.user_metadata,
          ...userInfo.nickName && {
            nickname: userInfo.nickName,
            username: userInfo.nickName
          },
          ...userInfo.avatarUrl && {
            avatar_url: userInfo.avatarUrl
          }
        }
      };
      const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, updateData);
      if (updateError) {
        throw new Error(`Failed to update user: ${updateError.message}`);
      }
      console.log('User metadata updated successfully');
      // Update users table
      const { error: dbUpdateError } = await supabaseAdmin.from('users').update({
        ...userInfo.nickName && {
          nickname: userInfo.nickName
        },
        ...userInfo.avatarUrl && {
          avatar_url: userInfo.avatarUrl
        },
        updated_at: new Date().toISOString()
      }).eq('id', user.id);
      if (dbUpdateError) {
        console.warn('Failed to update users table:', dbUpdateError);
      } else {
        console.log('Users table updated successfully');
      }
      const responseUser = {
        id: updatedUser.user.id,
        email: updatedUser.user.email,
        nickname: updatedUser.user.user_metadata?.nickname || '微信用户',
        avatar_url: updatedUser.user.user_metadata?.avatar_url,
        wechat_openid: updatedUser.user.user_metadata?.wechat_openid,
        display_name: updatedUser.user.user_metadata?.nickname || '微信用户',
        has_user_info: !!(updatedUser.user.user_metadata?.nickname && updatedUser.user.user_metadata?.avatar_url),
        isNew: false
      };
      return new Response(JSON.stringify({
        success: true,
        user: responseUser
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    // Handle session refresh
    if (code === 'refresh_session') {
      if (!refresh_token) {
        throw new Error('Missing refresh token for session refresh');
      }
      console.log('Processing session refresh request...');
      try {
        // 使用正确的 refresh token 方法
        const { data: refreshData, error: refreshError } = await supabaseAdmin.auth.refreshSession({
          refresh_token: refresh_token
        });
        if (refreshError || !refreshData.session) {
          throw new Error(`Session refresh failed: ${refreshError?.message}`);
        }
        console.log('Session refreshed successfully');
        const responseUser = {
          id: refreshData.user.id,
          email: refreshData.user.email,
          nickname: refreshData.user.user_metadata?.nickname || '微信用户',
          avatar_url: refreshData.user.user_metadata?.avatar_url || 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/picture/MiraclePlus-Avatar.png',
          wechat_openid: refreshData.user.user_metadata?.wechat_openid,
          display_name: refreshData.user.user_metadata?.nickname || '微信用户',
          has_user_info: !!(refreshData.user.user_metadata?.nickname && refreshData.user.user_metadata?.avatar_url),
          isNew: false
        };
        return new Response(JSON.stringify({
          success: true,
          session: refreshData.session,
          user: responseUser
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 200
        });
      } catch (refreshError) {
        console.error('Session refresh error:', refreshError);
        return new Response(JSON.stringify({
          success: false,
          error: `Session refresh failed: ${refreshError.message}`
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 400
        });
      }
    }
    // Handle regular login with WeChat code
    if (!code || code === 'refresh_session' || code === 'update_user_info') {
      throw new Error('Missing wechat code for login');
    }
    console.log('Processing WeChat login with code:', code.substring(0, 8) + '...');
    // Use directly configured WeChat credentials
    console.log('Using WeChat config:', {
      hasAppid: !!WECHAT_CONFIG.APPID,
      hasSecret: !!WECHAT_CONFIG.SECRET,
      appid: WECHAT_CONFIG.APPID
    });
    console.log('Calling WeChat jscode2session API...');
    const wechatApiUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${WECHAT_CONFIG.APPID}&secret=${WECHAT_CONFIG.SECRET}&js_code=${code}&grant_type=authorization_code`;
    const wechatResponse = await fetch(wechatApiUrl);
    const wechatData = await wechatResponse.json();
    console.log('WeChat API response:', {
      hasOpenid: !!wechatData.openid,
      hasError: !!wechatData.errcode,
      errcode: wechatData.errcode,
      errmsg: wechatData.errmsg
    });
    if (wechatData.errcode) {
      console.error('WeChat API error:', wechatData);
      throw new Error(`WeChat API error: ${wechatData.errmsg}`);
    }
    if (!wechatData.openid) {
      throw new Error('Failed to get openid from WeChat');
    }
    const openid = wechatData.openid;
    const unionid = wechatData.unionid; // 可选的unionid
    console.log('Got WeChat openid:', openid.substring(0, 8) + '...');
    // Check if user already exists with this openid
    const { data: existingUsers, error: queryError } = await supabaseAdmin.from('users').select('*').eq('wechat_openid', openid).limit(1);
    if (queryError) {
      console.error('Error querying existing users:', queryError);
      throw new Error(`Database query failed: ${queryError.message}`);
    }
    let user = existingUsers?.[0];
    let isNew = user ? false : true;
    let authUser;
    if (user) {
      console.log('Existing user found with openid:', user.id);
      // Get the auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(user.id);
      if (authError || !authData.user) {
        console.warn('Auth user not found, will recreate:', authError?.message);
        // Auth user missing, recreate
        const { data: newAuthData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
          id: user.id,
          email: `${openid}@wechat.local`,
          email_confirm: true,
          user_metadata: {
            provider: 'wechat',
            wechat_openid: openid,
            nickname: user.nickname || userInfo?.nickName || '微信用户',
            username: user.username || userInfo?.nickName || '微信用户',
            avatar_url: user.avatar_url || userInfo?.avatarUrl || 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/picture/MiraclePlus-Avatar.png'
          }
        });
        if (createAuthError) {
          throw new Error(`Failed to recreate auth user: ${createAuthError.message}`);
        }
        authUser = newAuthData.user;
      } else {
        authUser = authData.user;
      }
      // Update user info if provided
      if (userInfo && (userInfo.nickName || userInfo.avatarUrl)) {
        console.log('Updating existing user info...');
        const updates = {};
        if (userInfo.nickName) {
          updates.nickname = userInfo.nickName;
          updates.username = userInfo.nickName;
        }
        if (userInfo.avatarUrl) {
          updates.avatar_url = userInfo.avatarUrl;
        }
        updates.updated_at = new Date().toISOString();
        // Update users table
        const { error: updateError } = await supabaseAdmin.from('users').update(updates).eq('id', user.id);
        if (updateError) {
          console.warn('Failed to update user info:', updateError);
        } else {
          console.log('User info updated successfully');
          user = {
            ...user,
            ...updates
          };
        }
        // Update auth metadata
        const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...authUser.user_metadata,
            ...userInfo.nickName && {
              nickname: userInfo.nickName,
              username: userInfo.nickName
            },
            ...userInfo.avatarUrl && {
              avatar_url: userInfo.avatarUrl
            }
          }
        });
        if (authUpdateError) {
          console.warn('Failed to update auth metadata:', authUpdateError);
        }
      }
    } else {
      console.log('Creating new user with openid:', openid.substring(0, 8) + '...');
      // Generate UUID for new user
      const userId = crypto.randomUUID();
      // Create auth user first
      const { data: newAuthData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
        id: userId,
        email: `${openid}@wechat.local`,
        email_confirm: true,
        user_metadata: {
          provider: 'wechat',
          wechat_openid: openid,
          ...unionid && {
            wechat_unionid: unionid
          },
          nickname: userInfo?.nickName || '微信用户' + userId,
          username: userInfo?.nickName || '微信用户' + userId,
          avatar_url: userInfo?.avatarUrl || 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/picture/MiraclePlus-Avatar.png'
        }
      });
      if (createAuthError) {
        throw new Error(`Failed to create auth user: ${createAuthError.message}`);
      }
      authUser = newAuthData.user;
      // Create user in users table
      const { data: newUser, error: createUserError } = await supabaseAdmin.from('users').insert({
        id: userId,
        wechat_openid: openid,
        username: userInfo?.nickName || '微信用户' + userId,
        nickname: userInfo?.nickName || '微信用户' + userId,
        avatar_url: userInfo?.avatarUrl || 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/picture/MiraclePlus-Avatar.png',
        email: `${openid}@wechat.local`,
        role: 'user',
        is_active: true
      }).select().single();
      if (createUserError) {
        console.error('Failed to create user record:', createUserError);
        // Clean up auth user if database insert fails
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw new Error(`Failed to create user record: ${createUserError.message}`);
      }
      user = newUser;
      console.log('New user created successfully:', userId);
    }
    // Create session
    console.log('Creating session for user:', user.id);
    try {
      const tempPassword = 'temp_login_' + Math.random().toString(36).substring(2, 15);
      // Set temp password
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: tempPassword
      });
      if (passwordError) {
        throw new Error(`Failed to set temp password: ${passwordError.message}`);
      }
      console.log('Temp password set, creating session...');
      // Create session with password
      const { data: sessionData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: authUser.email,
        password: tempPassword
      });
      if (signInError || !sessionData.session) {
        throw new Error(`Failed to create session: ${signInError?.message}`);
      }
      console.log('Session created successfully');
      const validSessionData = {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_at: sessionData.session.expires_at,
        expires_in: sessionData.session.expires_in || 3600,
        token_type: sessionData.session.token_type || 'bearer',
        user: authUser
      };
      const responseUser = {
        id: user.id,
        email: user.email,
        nickname: user.nickname || '微信用户',
        avatar_url: user.avatar_url || 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/picture/MiraclePlus-Avatar.png',
        wechat_openid: openid,
        display_name: user.nickname || '微信用户',
        has_user_info: !!(user.nickname && user.avatar_url),
        isNew: isNew
      };
      return new Response(JSON.stringify({
        success: true,
        session: validSessionData,
        user: responseUser
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    } catch (sessionError) {
      console.error('Session creation failed, trying fallback:', sessionError);
      // Fallback to generateLink
      const { data: authLink, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: authUser.email,
        options: {
          redirectTo: 'https://gxvfcafgnhzjiauukssj.supabase.co/auth/callback'
        }
      });
      if (linkError || !authLink?.properties) {
        throw new Error(`Both session methods failed. Link error: ${linkError?.message}`);
      }
      const fallbackSessionData = {
        access_token: authLink.properties.access_token,
        refresh_token: authLink.properties.refresh_token,
        expires_at: authLink.properties.expires_at,
        expires_in: authLink.properties.expires_in || 3600,
        token_type: 'bearer',
        user: authUser
      };
      const responseUser = {
        id: user.id,
        email: user.email,
        nickname: user.nickname || '微信用户',
        avatar_url: user.avatar_url || 'https://gxvfcafgnhzjiauukssj.supabase.co/storage/v1/object/public/static-images/picture/MiraclePlus-Avatar.png',
        wechat_openid: openid,
        display_name: user.nickname || '微信用户',
        has_user_info: !!(user.nickname && user.avatar_url),
        isNew: true
      };
      console.log('Fallback session created for user:', user.id);
      return new Response(JSON.stringify({
        success: true,
        session: fallbackSessionData,
        user: responseUser
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
  } catch (error) {
    console.error('Wechat auth error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Authentication failed'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
