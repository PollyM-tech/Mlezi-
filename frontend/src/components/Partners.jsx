import lintechLogo from '../assets/lintech-logo.png'
import mylescorpLogo from '../assets/mylescorp-logo.avif'
import mleziLogo from '../assets/logo.png'

export default function Partners() {
  return <section id="sponsors-partners" className="landing-partners landing-container" aria-labelledby="partners-heading">
    <div className="landing-partners-heading">
      <span className="eyebrow">GROWING TOGETHER</span>
      <h2 id="partners-heading">Sponsors &amp; Partners</h2>
    </div>
    <ul className="landing-partner-list" aria-label="Mlezi sponsors and partners">
      <li className="landing-partner">
        <img className="landing-partner-logo" src={lintechLogo} alt="Lintech Telecom" loading="lazy" width="240" height="100" />
      </li>
      <li className="landing-partner">
        <img className="landing-partner-logo" src={mylescorpLogo} alt="Mylescorp Technologies" loading="lazy" width="240" height="100" />
      </li>
      <li className="landing-partner">
        <img className="landing-partner-logo" src={mleziLogo} alt="Mlezi Care" loading="lazy" width="240" height="100" />
      </li>
    </ul>
  </section>
}
