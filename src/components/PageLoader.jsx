import { Spin } from 'antd'
import './PageLoader.css'

/** Attente d'un chunk de page (les routes sont chargées en `lazy`). */
export default function PageLoader({ message = 'Chargement…' }) {
  return (
    <div className="page-loader">
      <Spin size="large" />
      <p>{message}</p>
    </div>
  )
}
