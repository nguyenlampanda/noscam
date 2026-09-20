import { Navigate } from 'react-router-dom'

import { getAdminToken } from '../../services/adminService'

function ProtectedAdminRoute({ children }) {
  const token = getAdminToken()

  if (!token) {
    return (
      <Navigate
        to="/admin/login"
        replace
      />
    )
  }

  return children
}

export default ProtectedAdminRoute