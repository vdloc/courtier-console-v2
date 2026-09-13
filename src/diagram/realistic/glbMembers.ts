import { Matrix4, Vector3, type Mesh } from 'three';
import { MODEL_BOUNDS } from './rig';

export interface GlbMember {
  mesh: Mesh;
  /** Pose the clip gives at the current time, before explode; re-read after every seek. */
  home: Vector3;
}

/** Filled while StructureGlb is mounted, so a measure point resolves against the live member. */
const members = new Map<string, GlbMember>();

const EXPLODE_CENTRE = new Vector3(
  (MODEL_BOUNDS.min[0] + MODEL_BOUNDS.max[0]) / 2,
  (MODEL_BOUNDS.min[1] + MODEL_BOUNDS.max[1]) / 2,
  (MODEL_BOUNDS.min[2] + MODEL_BOUNDS.max[2]) / 2,
);

export function registerGlbMembers(list: GlbMember[]) {
  members.clear();
  for (const member of list)
    if (member.mesh.name) members.set(member.mesh.name, member);
}

export function clearGlbMembers() {
  members.clear();
}

export function glbMember(name: string): GlbMember | undefined {
  return members.get(name);
}

export function explodedPosition(home: Vector3, factor: number, out: Vector3): Vector3 {
  return out.set(
    home.x + (home.x - EXPLODE_CENTRE.x) * factor,
    home.y + (home.y - EXPLODE_CENTRE.y) * factor * 1.6,
    home.z + (home.z - EXPLODE_CENTRE.z) * factor,
  );
}

const _position = new Vector3();
const _matrix = new Matrix4();

/** Composed from home + explode, not matrixWorld: StructureGlb applies explode in an effect, after the panel renders. */
export function glbLocalToWorld(
  member: GlbMember,
  local: [number, number, number],
  explodeFactor: number,
): Vector3 {
  const { mesh, home } = member;
  _matrix.compose(
    explodedPosition(home, explodeFactor, _position),
    mesh.quaternion,
    mesh.scale,
  );
  if (mesh.parent) {
    mesh.parent.updateWorldMatrix(true, false);
    _matrix.premultiply(mesh.parent.matrixWorld);
  }
  return new Vector3(...local).applyMatrix4(_matrix);
}
