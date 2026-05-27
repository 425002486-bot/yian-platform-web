import request from '@/config/axios'
import type { RegisterVO, UserLoginVO } from './types'

export interface SmsCodeVO {
  mobile: string
  scene: number
}

export interface SmsLoginVO {
  mobile: string
  code: string
}

const useLocalDemoAuthFallback = () => {
  const baseUrl = String(import.meta.env.VITE_BASE_URL || '')
  return import.meta.env.DEV && baseUrl.includes('localhost:48080')
}

const buildMockMenus = () => [
  {
    name: '工作台',
    path: '/dashboard',
    component: 'Layout',
    componentName: 'YianDashboardRoot',
    icon: 'ep:monitor',
    visible: true,
    keepAlive: true,
    alwaysShow: true,
    parentId: 0,
    children: [
      {
        name: '工作台',
        path: 'index',
        component: 'yian/dashboard/index',
        componentName: 'YianDashboardIndex',
        icon: 'ep:monitor',
        visible: true,
        keepAlive: true,
        parentId: 1
      }
    ]
  },
  {
    name: '资产中心',
    path: '/asset',
    component: 'Layout',
    componentName: 'YianAssetRoot',
    icon: 'ep:cpu',
    visible: true,
    keepAlive: true,
    alwaysShow: true,
    parentId: 0,
    children: [
      {
        name: '设备台账',
        path: 'device',
        component: 'yian/asset/device/index',
        componentName: 'AssetDevice',
        icon: 'ep:monitor',
        visible: true,
        keepAlive: true,
        parentId: 2
      },
      {
        name: '\u8d44\u4ea7\u5de1\u68c0',
        path: 'inspection',
        component: 'yian/asset/inspection/index',
        componentName: 'AssetInspection',
        icon: 'ep:checked',
        visible: true,
        keepAlive: true,
        parentId: 2
      },
      {
        name: '\u8d44\u4ea7\u5bfc\u5165',
        path: 'import',
        component: 'yian/asset/import/index',
        componentName: 'AssetImport',
        icon: 'ep:upload',
        visible: true,
        keepAlive: true,
        parentId: 2
      },
      {
        name: '电池管理',
        path: 'battery',
        component: 'yian/asset/battery/index',
        componentName: 'AssetBattery',
        icon: 'ep:cellphone',
        visible: true,
        keepAlive: true,
        parentId: 2
      }
    ]
  },
  {
    name: '工单中心',
    path: '/workorder',
    component: 'Layout',
    componentName: 'YianWorkorderRoot',
    icon: 'ep:tickets',
    visible: true,
    keepAlive: true,
    alwaysShow: true,
    parentId: 0,
    children: [
      {
        name: '工单看板',
        path: 'board',
        component: 'yian/workorder/board/index',
        componentName: 'YianWorkorderBoard',
        icon: 'ep:data-analysis',
        visible: true,
        keepAlive: true,
        parentId: 3
      },
      {
        name: '工单列表',
        path: 'list',
        component: 'yian/workorder/list/index',
        componentName: 'YianWorkorderList',
        icon: 'ep:list',
        visible: true,
        keepAlive: true,
        parentId: 3
      },
      {
        name: '新建工单',
        path: 'create',
        component: 'yian/workorder/create/index',
        componentName: 'YianWorkorderCreate',
        icon: 'ep:plus',
        visible: true,
        keepAlive: true,
        parentId: 3
      }
    ]
  },
  {
    name: '备件库存',
    path: '/inventory',
    component: 'Layout',
    componentName: 'YianInventoryRoot',
    icon: 'ep:box',
    visible: true,
    keepAlive: true,
    alwaysShow: true,
    parentId: 0,
    children: [
      {
        name: '库存台账',
        path: 'stock',
        component: 'yian/inventory/stock/index',
        componentName: 'YianInventoryStock',
        icon: 'ep:collection',
        visible: true,
        keepAlive: true,
        parentId: 4
      },
      {
        name: '入库记录',
        path: 'inbound',
        component: 'yian/inventory/inbound/index',
        componentName: 'YianInventoryInbound',
        icon: 'ep:download',
        visible: true,
        keepAlive: true,
        parentId: 4
      },
      {
        name: '领料记录',
        path: 'pick',
        component: 'yian/inventory/pick/index',
        componentName: 'YianInventoryPick',
        icon: 'ep:promotion',
        visible: true,
        keepAlive: true,
        parentId: 4
      },
      {
        name: '????',
        path: 'import',
        component: 'yian/inventory/import/index',
        componentName: 'YianInventoryImport',
        icon: 'ep:upload',
        visible: true,
        keepAlive: true,
        parentId: 4
      }
    ]
  },
  {
    name: '审计日志',
    path: '/audit',
    component: 'Layout',
    componentName: 'YianAuditRoot',
    icon: 'ep:document',
    visible: true,
    keepAlive: true,
    alwaysShow: true,
    parentId: 0,
    children: [
      {
        name: '操作日志',
        path: 'log',
        component: 'yian/audit/log/index',
        componentName: 'YianAuditLog',
        icon: 'ep:document',
        visible: true,
        keepAlive: true,
        parentId: 5
      }
    ]
  },
  {
    name: '基础配置',
    path: '/config',
    component: 'Layout',
    componentName: 'YianConfigRoot',
    icon: 'ep:setting',
    visible: true,
    keepAlive: true,
    alwaysShow: true,
    parentId: 0,
    children: [
      {
        name: '人员权限',
        path: 'people',
        component: 'yian/config/people/index',
        componentName: 'YianConfigPeople',
        icon: 'ep:user',
        visible: true,
        keepAlive: true,
        parentId: 6
      },
      {
        name: '角色配置',
        path: 'role',
        component: 'yian/config/role/index',
        componentName: 'YianConfigRole',
        icon: 'ep:user-filled',
        visible: true,
        keepAlive: true,
        parentId: 6
      },
      {
        name: '规则中心',
        path: 'rule',
        component: 'yian/config/rule/index',
        componentName: 'YianConfigRule',
        icon: 'ep:operation',
        visible: true,
        keepAlive: true,
        parentId: 6
      },
      {
        name: 'SLA 配置',
        path: 'sla',
        component: 'yian/config/sla/index',
        componentName: 'YianConfigSla',
        icon: 'ep:timer',
        visible: true,
        keepAlive: true,
        parentId: 6
      },
      {
        name: '站点管理',
        path: 'station',
        component: 'yian/config/station/index',
        componentName: 'YianConfigStation',
        icon: 'ep:office-building',
        visible: true,
        keepAlive: true,
        parentId: 6
      }
    ]
  }
]

const buildMockToken = () => ({
  id: 1,
  accessToken: 'local-demo-access-token',
  refreshToken: 'local-demo-refresh-token',
  userId: 1,
  userType: 1,
  clientId: 'demo-web',
  expiresTime: Date.now() + 24 * 60 * 60 * 1000
})

const buildMockPermissionInfo = () => ({
  permissions: ['*:*:*'],
  roles: ['admin'],
  user: {
    id: 1,
    username: 'admin',
    nickname: '芋道源码',
    deptId: 1,
    email: 'admin@example.com',
    mobile: '13800000000',
    sex: 1,
    avatar: '',
    loginIp: '127.0.0.1',
    loginDate: new Date().toISOString()
  },
  menus: buildMockMenus()
})

// 登录
export const login = async (data: UserLoginVO) => {
  try {
    return await request.post({
      url: '/system/auth/login',
      data,
      headers: {
        isEncrypt: false
      }
    })
  } catch (error) {
    if (useLocalDemoAuthFallback()) {
      console.warn('[login] use local demo auth fallback')
      return buildMockToken()
    }
    throw error
  }
}

// 注册
export const register = (data: RegisterVO) => {
  return request.post({ url: '/system/auth/register', data })
}

// 使用租户名称，获得租户编号
export const getTenantIdByName = async (name: string) => {
  try {
    return await request.get({ url: '/system/tenant/get-id-by-name?name=' + name })
  } catch (error) {
    if (useLocalDemoAuthFallback()) {
      return 1
    }
    throw error
  }
}

// 使用租户域名，获得租户信息
export const getTenantByWebsite = async (website: string) => {
  try {
    return await request.get({ url: '/system/tenant/get-by-website?website=' + website })
  } catch (error) {
    if (useLocalDemoAuthFallback()) {
      return {
        id: 1,
        name: import.meta.env.VITE_APP_DEFAULT_LOGIN_TENANT || '翼安智链'
      }
    }
    throw error
  }
}

// 登出
export const loginOut = async () => {
  try {
    return await request.post({ url: '/system/auth/logout' })
  } catch (error) {
    if (useLocalDemoAuthFallback()) {
      return true
    }
    throw error
  }
}

// 获取用户权限信息
export const getInfo = async () => {
  try {
    return await request.get({ url: '/system/auth/get-permission-info' })
  } catch (error) {
    if (useLocalDemoAuthFallback()) {
      console.warn('[login] use local demo permission fallback')
      return buildMockPermissionInfo()
    }
    throw error
  }
}

// 获取登录验证码
export const sendSmsCode = (data: SmsCodeVO) => {
  return request.post({ url: '/system/auth/send-sms-code', data })
}

// 短信验证码登录
export const smsLogin = (data: SmsLoginVO) => {
  return request.post({ url: '/system/auth/sms-login', data })
}

// 社交快捷登录，使用 code 授权码
export function socialLogin(type: string, code: string, state: string) {
  return request.post({
    url: '/system/auth/social-login',
    data: {
      type,
      code,
      state
    }
  })
}

// 社交授权的跳转
export const socialAuthRedirect = (type: number, redirectUri: string) => {
  return request.get({
    url: '/system/auth/social-auth-redirect?type=' + type + '&redirectUri=' + redirectUri
  })
}

// 获取验证码图片以及 token
export const getCode = (data: any) => {
  return request.postOriginal({ url: 'system/captcha/get', data })
}

// 滑动或者点选验证
export const reqCheck = (data: any) => {
  return request.postOriginal({ url: 'system/captcha/check', data })
}

// 通过短信重置密码
export const smsResetPassword = (data: any) => {
  return request.post({ url: '/system/auth/reset-password', data })
}



