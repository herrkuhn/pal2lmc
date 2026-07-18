// Base64-encoded copies of the golden-pair source .pal binaries (192 bytes
// each). Decode with decodePalBase64() to obtain raw bytes for parsePal()
// input. Two origins:
//  - Seven FBX-era palettes, byte-identical to the vendored fbx_pal/*.pal
//    copies (canonical download: FirebrandX November-2017 bundle).
//  - Four NES HDR palettes by Mike Chi, NOT vendored anywhere in this repo
//    (canonical download: rt4k_nes_hdr_v2.zip, RetroTINK-LLC firmware repo).
// Each pair's exact download URL and in-archive path live on GOLDEN_PAIRS
// (lmc-fixtures.ts), so replacing this embedding with download-on-init
// needs no further research.
//
// Generated (not hand-typed) from those source files so the corpus bytes and
// this file cannot drift silently. Lives beside lmc-fixtures.ts, which both
// mapper.spec.ts and golden.spec.ts import, so the two specs share one
// fixture source instead of each embedding their own copy. Base64-in-.ts
// sidesteps test-runner binary asset loading; atob is available under
// Vitest/jsdom with zero extra tooling.

// Decode a base64-embedded .pal fixture. Use as parsePal() input in tests.
export function decodePalBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Source: fbx_pal/Composite Direct (FBX).pal
export const COMPOSITE_DIRECT_FBX_PAL_B64 =
  'ZWVlABJ9GACONgCCVgBdWgAYTwUAOBkAHTEAAD0AAEEAADsXAC5VAAAAAAAAAAAAr6+vGU7IRy/jax/XkxuunhpemTIAe0sAW2cAJnoAAIIAAHo+AG6KAAAAAAAAAAAA////ZKn/jon/tnb/4G//72zE8IBq2JgsubQKg8sMW9Y/StF+TcfLTExMAAAAAAAA////x+X/2dn/6dH/+c7//8zx/9TL+N+x7eqk1vSkxfi4vvbTv/Hxubm5AAAAAAAA';

// Source: fbx_pal/NES Classic (FBX).pal
export const NES_CLASSIC_FBX_PAL_B64 =
  'YWFhAACIHw2ZNxN5VhJgXQAQUg4AOiMIITUMDUEOF0QXADofAC9XAAAAAAAAAAAAqqqqDU3ESyTeaRLPkBStnRxIkjQEc1AFXWkTFnoRE4AIEnZJHGaRAAAAAAAAAAAA/Pz8Y5r8in78sGr83W3y53Gr44ZYzJ4iqLEAcsEAWs1ONMKOT77OQkJCAAAAAAAA/Pz8vtT8ysr82cT87MH8+sPn987D4s2n2tucyOOev+W4suvIt+XrrKysAAAAAAAA';

// Source: fbx_pal/PC-10.pal
export const PC10_PAL_B64 =
  'bW1tACSSAADbbUnbkgBttgBttiQAkkkAbUkAJEkAAG0kAJIAAElJAAAAAAAAAAAAtra2AG3bAEn/kgD/tgD//wCS/wAA220Akm0AJJIAAJIAALZtAJKSJCQkAAAAAAAA////bbb/kpL/223//wD//23//5IA/7YA29sAbdsAAP8ASf/bAP//SUlJAAAAAAAA////ttv/27b//7b//5L//7a2/9uS//9J//9ttv9Jkv9tSf/bktv/kpKSAAAAAAAA';

// Source: fbx_pal/PVM Style D93 (FBX).pal
export const PVM_STYLE_D93_FBX_PAL_B64 =
  'aWtjABd0HgCHNABzVgBXXgATUxoAOyQAJDAABjoAAD8AADseADNOAAAAAAAAAAAAubuzFFO5TSzaZx7emBicnSNEoD4AjVUAZW0ALHkAAIEAAH1CAHiKAAAAAAAAAAAA////aaj/lpH/sor66n3683vH8o5Z5q0n18gFkN8HZOU8ReJ9SNXZTlBIAAAAAAAA////0ur/4uL/6dj/9dL/+Nnq+t65+eib8/KM0/qRuPyorvrKyvPzvsC4AAAAAAAA';

// Source: fbx_pal/Smooth (FBX).pal
export const SMOOTH_FBX_PAL_B64 =
  'am1qABOAHgCKOQB6VQBWWgAYTxAAPRwAJTIAAD0AAEAAADkkAC5VAAAAAAAAAAAAuby5GFDHSzDjcyLWlR+pnShcmDcAf0wAXmQAIncAAn4CAHZFAG6KAAAAAAAAAAAA////aKb/jJz/tYb/2XX943e55Y1o1J0ps68Me8IRVcpHRsuBR8HFSk1KAAAAAAAA////zOr/3d7/7Nr/+Nf+/Nb1/dvP+ee18fCq2vqpyf+8w/vXxPb2vsG+AAAAAAAA';

// Source: fbx_pal/Sony CXA.pal
export const SONY_CXA_PAL_B64 =
  'WFhYACOMABObLQWFXQBSegAXeggAXxgANSoACTkAAD8AADwiADJdAAAAAAAAAAAAoaGhAFPuFTz+YCjkqR2Y1B5B0iwAqkQAbF4ALXMAAH0GAHhSAGmpAAAAAAAAAAAA////H6X+Xon+tXL+/mX2/meQ/nc8/pMIxLIAecoQOtVKEdGkBr/+QkJCAAAAAAAA////oNn+vcz+4cL+/rz7/r3Q/sWp/tGO6d6Gx+mSqO6wlezZkeT+rKysAAAAAAAA';

// Source: fbx_pal/Wavebeam.pal
export const WAVEBEAM_PAL_B64 =
  'a2trABuIIQCaQACMYABnZAAeWQgASBYAKDYAAEUAAEkIAEIdADZZAAAAAAAAAAAAtLS0FVXTQzfvdCXfnBm5rA9kqiwAiksAZmsAIYMAAIoAAIFEAHaRAAAAAAAAAAAA////Y7L/fJz/wH3+6Xf/9XLN9Ihr3aApvb0KidIOXN4+S9iGTc/SUlJSAAAAAAAA////vN//0tL/4cj/78f//8Ph/8rG8tqt6+Og0u2ivPS0tfHOtuzxv7+/AAAAAAAA';

// Source: rt4k_nes_hdr_raw.pal in rt4k_nes_hdr_v2.zip (Mike Chi's NES HDR
// palette set, RetroTINK-LLC/firmware repo). Not vendored in fbx_pal/.
export const NES_HDR_RAW_PAL_B64 =
  'OTk5BQ9xEAl/LghxQwVHTAQLQwQALA8ADiQABDAABTQABC4LBCBHAAAAAAAAAAAAbGxsEjGzNCDGWxezeRJ+gw8wdx0AWjUAM00AE18AEGQAD1swDkh+AAAAAAAAAAAAoqKiQ2jsa1H/kkLsrzy1uUForlQWkWwAaYUAQ5YALJsUJZNoK4C1KysrAAAAAAAAoqKifIzBjIHInHvBp3mqq3uMp4NtnI1VjJdMfJ1VcaBtbZyMcZSqdXV1AAAAAAAA';

// Source: rt4k_nes_hdr_soft_clamp.pal in rt4k_nes_hdr_v2.zip (Mike Chi's NES
// HDR palette set, RetroTINK-LLC/firmware repo). Not vendored in fbx_pal/.
export const NES_HDR_SOFT_CLAMP_PAL_B64 =
  'Pz8/BhF9EgqNMwh9SwZPVQQNSwQAMREAECcABDYABjoABDMNBCNPAAAAAAAAAAAAeHh4FDfCOiPSZRnChhSMkRE2hCAAZDsAOFYAFWoAEm8AEWU2EFCMAAAAAAAAAAAAtLS0S3Twdlr/oknwv0LEx0h0vl0YoXgAdZQAS6YAMawXKaN0MI7EMDAwAAAAAAAAtLS0ipvOm5DUrYnOuYa7vImbuZF5rZxem6hViq9efbJ5ea2bfaW7goKCAAAAAAAA';

// Source: rt4k_nes_hdr_med_clamp.pal in rt4k_nes_hdr_v2.zip (Mike Chi's NES
// HDR palette set, RetroTINK-LLC/firmware repo). Not vendored in fbx_pal/.
export const NES_HDR_MEDIUM_CLAMP_PAL_B64 =
  'RUVFBhKIFAuZNwmIUQZWXAUOUQUANhIAESsABToABj8ABTcOBSZWAAAAAAAAAAAAgoKCFTzPPybcbhzPkRWXnhI6kCMAbUAAPV0AF3MAFHkAEm46EVeXAAAAAAAAAAAAxMTEUX30gWL/sFD0zEjR0059zGUaroIAf6EAUbUANrsYLLJ9NJvRNDQ0AAAAAAAAxMTElqjYqJzdvJTYx5HJypSox56EvKpnqLZclr5niMGEhLyoiLPJjY2NAAAAAAAA';

// Source: rt4k_sony_hdr_no_knee.pal in rt4k_nes_hdr_v2.zip (Mike Chi's NES
// HDR palette set, RetroTINK-LLC/firmware repo). Not vendored in fbx_pal/.
export const NES_HDR_SONY_DECODER_PAL_B64 =
  'SUlJBhtrGxN3Lg9rPQxJQw0bPRMALhsAGyEABicAACgAACcbACJJAAAAAAAAAAAAf39/JECtQDa/WzCtbi1/di5AbjYAWz8AQEkAJFEAEFQACVFAEEt/AAAAAAAAAAAAvb29X33vfHP/mGvvrWi9tGp8rXE6mHwKfIYAX44KS5E6Q458S4a9Ojo6AAAAAAAAvb29mKTRpKDYrp3Rt5u9up2kt6CJrqR2pKdumKp2j6uJjKukj6m9iYmJAAAAAAAA';

