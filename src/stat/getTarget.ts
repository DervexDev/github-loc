export default function getTarget() {
  return window.location.pathname.split('/').slice(1, 3)
}
