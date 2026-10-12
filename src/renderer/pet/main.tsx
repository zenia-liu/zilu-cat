import { createRoot } from 'react-dom/client'
import { Pet } from './Pet'
import './pet.css'

createRoot(document.getElementById('root')!).render(<Pet />)
