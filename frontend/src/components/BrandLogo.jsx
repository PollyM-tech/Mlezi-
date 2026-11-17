import logo from '../assets/logo.svg'

// Discourages casual saving; a publicly displayed asset remains downloadable.
export default function BrandLogo({ alt = 'Mlezi' }) {
  function preventCopy(event) {
    event.preventDefault()
  }

  return <img className="brand-logo" src={logo} alt={alt} draggable={false} onDragStart={preventCopy} onContextMenu={preventCopy} />
}
