import { V3Icon } from "../../components/atoms";

export function SatelliteAnim() {
  return (
    <div className="v3-satellite-anim" aria-hidden="true">
      <i className="orbit-ring" />
      <i className="earth-dot" />
      <span className="orbiting-sat"><V3Icon name="satellite" size={10} color="#e07a3c" /></span>
    </div>
  );
}

