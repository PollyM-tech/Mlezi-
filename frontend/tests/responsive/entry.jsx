import { createRoot } from "react-dom/client";
import "../../src/index.css";
import "../../src/landing.css";
import App from "../../src/App.jsx";
import Landing from "../../src/components/Landing.jsx";
import PublicPages from "../../src/components/PublicPages.jsx";
import CookieConsent from "../../src/components/CookieConsent.jsx";
import FaqAssistant from "../../src/components/FaqAssistant.jsx";
import { publicPage } from "../../src/lib/public-pages.js";
const screen = new URLSearchParams(location.search).get("screen") || "home";
const paths = {
  signin: "/signin",
  caregiver: "/caregiver",
  employer: "/employer",
  workspace: "/workspace",
  "profile-edit": "/workspace",
  profile: "/caregivers/sample1",
  discovery: "/caregivers",
  shortlist: "/shortlist",
  contacts: "/contacts",
  account: "/account",
  identity: "/identity",
  membership: "/membership",
  premium: "/membership",
  support: "/tickets",
  privacy: "/privacy-account",
  admin: "/workspace",
};
window.__RESPONSIVE_ROLE__ = [
  "workspace",
  "profile-edit",
  "identity",
  "premium",
].includes(screen)
  ? "caregiver"
  : screen === "admin"
    ? "admin"
    : "employer";
window.__RESPONSIVE_SIGNED_OUT__ = ["signin", "caregiver", "employer"].includes(
  screen,
);
if (paths[screen]) history.replaceState({}, "", paths[screen]);
const publicPath = {
  legal: "/privacy/",
  regional: "/burundi/",
  guest: "/support/",
}[screen];
createRoot(document.getElementById("root")).render(
  screen === "home" ? (
    <>
      <Landing />
      <CookieConsent />
      <FaqAssistant />
    </>
  ) : publicPath ? (
    <>
      <PublicPages page={publicPage(publicPath)} />
      <CookieConsent />
      <FaqAssistant />
    </>
  ) : (
    <>
      <App />
      <FaqAssistant />
    </>
  ),
);
document.documentElement.dataset.responsiveFixture = "ready";
