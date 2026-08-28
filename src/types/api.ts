export interface User {
  id: string
  email: string
  name: string
}

export interface AuthResponse {
  accessToken: string
  user: User
}
