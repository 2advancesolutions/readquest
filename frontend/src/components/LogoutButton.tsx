import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export const LogoutButton = () => {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <button onClick={handleLogout} className="text-sm font-medium text-gray-500 hover:text-gray-700 ml-4">
      Logout
    </button>
  )
}
