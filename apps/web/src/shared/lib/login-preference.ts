export type LoginType = 'institution' | 'personal'

const STORAGE_KEY = 'auleka-login-type'

export function getLoginTypePreference(): LoginType {
  return localStorage.getItem(STORAGE_KEY) === 'personal' ? 'personal' : 'institution'
}

export function setLoginTypePreference(type: LoginType): void {
  localStorage.setItem(STORAGE_KEY, type)
}
