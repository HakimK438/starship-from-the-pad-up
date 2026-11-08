// All explanatory text. Three depths per chapter, written for serious learners:
// every chapter states one key idea, builds it with reasoning and worked numbers, names a common
// misconception, and links forward to the next chapter so the flight reads as one chain of cause and effect.
// Sources: Starship Report (Payload Research, Jan 2024); Sutton & Biblarz, Rocket Propulsion Elements, 9th ed.;
// Anderson, Fundamentals of Aerodynamics, 6th ed. Numbers are approximate public figures, labelled as such.
const W = (n) => `<div class="widget" data-widget="${n}"></div>`;
const src = (t) => `<p class="src">${t}</p>`;
const key = (t) => `<p class="key">${t}</p>`;
const thread = (t) => `<p class="thread"><b>Next:</b> ${t}</p>`;
const myth = (t) => `<div class="myth"><p><b>Common misconception.</b> ${t}</p></div>`;
const check = (q, a) => `<details><summary>Check yourself: ${q}</summary>${a}</details>`;
const work = (t) => `<div class="work">${t}</div>`;

export const PARTS = {
  nose: { name: 'Nose and payload bay', general: 'The pointed top holds cargo or people: about 1,000 cubic metres, roughly the pressurised volume of the International Space Station.', intermediate: 'The payload bay sits in the nosecone. The ogive shape keeps wave drag low at supersonic speed, and the bay is meant to hold either a crew cabin or large satellites (the Starship Report quotes an 8 m wide fairing up to about 22 m tall).', detail: 'Payload volume about 1,000 m³ (Starship Report). Cargo mass target 150 t reusable, 250 t expendable in the report (V1-era figures; the 200 t reusable figure assumes Raptor 3). The ogive is drawn here as a schematic profile.' },
  headerTanks: { name: 'Header tanks', general: 'Small extra tanks near the nose. They hold the propellant for the final landing flip, so the engines get clean fuel while the big tanks slosh.', intermediate: 'After the belly flop the ship rotates upright. Propellant left in the main tanks is thrown around and could feed gas bubbles to the pumps, so a small LOX tank and a small methane tank hold the landing propellant.', detail: 'Header tanks feed the landing burn only. Placement and size here are schematic. They exist because the main tanks cannot guarantee settled liquid at the pump inlets during the flip (a turbopump that swallows gas can overspeed and fail).' },
  shipTanks: { name: 'Main propellant tanks', general: 'Most of the ship is tank: liquid oxygen and liquid methane, kept very cold, separated by a shared wall.', intermediate: 'About 1,200 t of propellant in the ship. Roughly 78% of that mass is oxygen, 22% methane. Oxygen dominates the mass, but methane is much less dense, so the two tanks are closer in size.', detail: 'Mixture ratio O/F about 3.6 by mass. LOX about 1,141 kg/m³, liquid methane about 422 kg/m³, so the volume split is about 57:43. Tank order differs between design versions; this model does not assert it for the ship.' },
  fwdflap: { name: 'Forward flaps', general: 'Two small flaps near the nose. They tilt to steer during the fall back to Earth.', intermediate: 'The ship falls belly-first. The flaps change how much drag each end makes, so the ship pitches and rolls with no wings or tail.', detail: 'Forward flaps are smaller than the aft pair and sit far forward of the centre of mass. Differential deflection between the four flaps gives pitch, roll and yaw control through re-entry. Dimensions here are approximate.' },
  aftflap: { name: 'Aft flaps', general: 'Two bigger flaps at the bottom of the ship. They do most of the steering during re-entry.', intermediate: 'The engines make the aft end heavy, so the centre of mass is far aft. Bigger aft flaps balance the drag so the ship can hold a stable belly-down attitude.', detail: 'Trim needs the centre of pressure near the centre of mass. With the engines aft, the aft flaps carry more area. They fold in as the ship flips upright for the landing burn.' },
  shipRaptors: { name: '6 Raptors: 3 sea-level + 3 vacuum', general: 'Six engines at the base of the ship: three for use in air, three with huge bells for space.', intermediate: 'Sea-level engines have smaller bells. Vacuum versions have much wider ones, which squeeze more push out of the exhaust when there is no air pressing back (Sutton, Ch. 3: under- and over-expanded nozzles).', detail: 'About 327 s Isp (sea-level bell) vs about 380 s (vacuum bell), published estimates. Expansion ratio about 34 vs about 80. Plans call for 9 Raptors on the ship in a later configuration (Starship Report).' },
  hotstage: { name: 'Hot-stage ring', general: 'A vented ring between the stages. The ship lights its engines before it lets go.', intermediate: 'The ring is open so the ship’s exhaust can escape sideways instead of blasting into the booster’s closed top dome.', detail: 'Hot staging lets the ship ignite while still attached, with propellant held at the tank bottoms by the booster’s remaining acceleration. The booster top is shielded, and the vents release the exhaust.' },
  gridfin: { name: 'Grid fins', general: 'Four lattice fins on the booster. They steer it back down like a skydiver’s hands.', intermediate: 'A lattice fin stays effective at supersonic and transonic speed and needs little hinge force. The booster uses them to glide back to the tower after separation.', detail: 'Grid fins have short chord, so hinge moments stay small and they do not stall at high angle of attack. They also serve as lift points in Mechazilla catch concepts. Dimensions here are approximate.' },
  boosterLOX: { name: 'Booster oxygen tank', general: 'The upper tank in the booster, full of liquid oxygen.', intermediate: 'Liquid oxygen is the oxidiser. The engines burn about 3.6 kg of it for every kilogram of methane, so it fills most of the booster.', detail: 'Booster propellant total about 3,400 t (V1 era). A LOX downcomer carries oxidiser through the methane tank to the engines (per public cutaways).' },
  boosterCH4: { name: 'Booster methane tank', general: 'The lower tank holds liquid methane, the fuel.', intermediate: 'Methane is cheap, dense enough to store compactly, and burns cleanly in a reusable engine.', detail: 'Sutton (Ch. 7): liquid methane is abundant, low in cost, has reproducible properties, and is about 6 times denser than liquid hydrogen, so its tanks are smaller and cheaper.' },
  downcomer: { name: 'LOX downcomer', general: 'A big pipe carrying oxygen from the upper tank down to the engines.', intermediate: 'The oxygen tank is above the methane tank, so a tube runs through the methane tank.', detail: 'Drawn from public cutaway diagrams. At full thrust 33 engines draw roughly 23 t/s of propellant, about 18 t/s of it LOX: that is the flow this pipe must carry.' },
  boosterRaptors: { name: '33 Raptor engines', general: '33 engines under the booster: the most powerful rocket stage ever flown.', intermediate: '13 in the middle can swivel for steering, 20 around the edge are fixed. At liftoff they push with about 7,500 tonnes of force.', detail: 'Raptor 2 about 230 tf each (2.26 MN), so 33 × 230 tf ≈ 7,590 tf (74 MN). Layout: 3 inner + 10 middle (these 13 gimbal), 20 outer fixed. Raptor 3 prototypes are quoted at 270+ tf (Starship Report).' },
};

export const CONTENT = [
{
  id: 'hero', short: 'Starbase', title: '', sub: '', run: '150vh', action: ['begin', 'Start the tour'],
  general: `<h1 class="hero-title">Starship, from the pad up</h1>
    <p>You are standing at Starbase, on the Texas coast, at sunset. The steel rocket beside the tower is 121 metres tall and weighs about 5,000 tonnes, almost all of it cold liquid propellant.</p>
    <p>Over 13 short chapters you will follow one flight: what the rocket is made of, how its engines work, why it leans over as it climbs, how it reaches orbit, how it survives the fall back, and how the tower catches it.</p>
    <p>Each chapter builds on the one before, so by the end you should be able to explain the whole flight yourself. Use the <b>depth switch</b> at the top: General explains the ideas, Intermediate works through the numbers, Detail adds the equations and textbook sources.</p>
    <p class="thread">Scroll, use the ← → keys, or click the dots on the left. Press <b>H</b> to hide these notes and watch the scene.</p>`,
  intermediate: `<h1 class="hero-title">Starship, from the pad up</h1>
    <p>One flight, end to end, told as a chain of cause and effect. Engines turn propellant into momentum. That momentum has to beat gravity first and then build sideways speed. The rocket equation sets how much propellant that costs, which is why there are two stages. On the way down, the same atmosphere that was a drag on the way up becomes the brake.</p>
    <p>Every number in the strip at the bottom comes from a small physics model, the same one you can fly yourself in chapter 10. Where it simplifies reality, the text says so.</p>
    <p class="thread">Scroll, use the ← → keys, or click the dots on the left. Press <b>H</b> to hide these notes.</p>`,
  detail: `<h1 class="hero-title">Starship, from the pad up</h1>
    <p>This guide follows the vehicle the way an engineer would: structure and propellants, the Raptor cycle, the thrust and rocket equations (Sutton &amp; Biblarz, Ch. 2–4), ascent losses, hot staging, orbital mechanics, hypersonic re-entry (Anderson, Ch. 1 and 8) and the catch.</p>
    <p>Figures are approximate public values from the Starship Report (Jan 2024, V1 era). The simulator is a planar point-mass model with an exponential atmosphere, a Mach-dependent drag coefficient and altitude-dependent thrust. It reproduces the trends and orders of magnitude, not the actual flight data.</p>
    <p class="thread">Keys: ← → chapters, <b>H</b> hide notes.</p>
    <button class="action" data-action="watch">Watch the whole flight</button>`
},
{
  id: 'scale', short: 'Scale', when: 'On the pad', title: 'How big is it?', sub: 'Taller than Saturn V, and more than nine-tenths propellant.',
  general: `${key('Starship is huge because reaching orbit takes an enormous amount of propellant, not because the cargo is big.')}
    <p>Starship is <b>121 metres</b> tall and <b>9 metres</b> wide. The lower part is the <b>Super Heavy booster</b> (71 m), the upper part is the <b>ship</b> (50 m). The ruler beside the rocket marks every 10 m.</p>
    <p>Fully fuelled it weighs about <b>5,000 tonnes</b>, the same as roughly 3,500 cars. Only about one-fiftieth of that is cargo. Most of the rest is liquid oxygen and liquid methane that will be burnt within nine minutes.</p>
    ${W('scalebars')}
    ${myth('“A bigger rocket is for bigger cargo.” Mostly it is for more propellant. Chapter 5 shows why the propellant needed grows much faster than the speed you get.')}
    ${thread('what the rocket is made of, and why steel.')}`,
  intermediate: `${key('More than 90% of the liftoff mass is propellant. That one ratio drives almost every design choice in the vehicle.')}
    <p>At 121 m the stack is taller than Saturn V (110.6 m). It is a slender cylinder, about 13 times taller than it is wide, and nearly all of that volume is tank.</p>
    ${work('Booster: ≈ 275 t dry + ≈ 3,400 t propellant<br>Ship: ≈ 120 t dry + ≈ 1,200 t propellant<br>Payload (this guide): 100 t<br><span>Total ≈ 5,100 t → propellant fraction ≈ 4,600 / 5,100 ≈ 90%</span>')}
    <p>For comparison, a loaded airliner is about 30–40% fuel by mass. A rocket has to carry its oxidiser as well as its fuel, and it needs far more energy per kilogram delivered.</p>
    ${W('scalebars')}
    ${check('if the payload doubled to 200 t, would the rocket need to double in size?', '<p>No. Doubling payload raises the final mass of the ship, which lowers its mass ratio and therefore its Δv (chapter 5). To recover the Δv you need more propellant, which needs more structure, which needs more propellant... Growth is steeper than linear, which is why every tonne of dry mass matters.</p>')}
    ${thread('the structure: steel tanks, flaps and fins.')}`,
  detail: `${key('Propellant mass fraction ζ = m<sub>p</sub>/m<sub>0</sub> ≈ 0.9 for the stack. The rocket equation turns that fraction into speed.')}
    <p>Stack height 121 m (booster 71 m, ship 50 m), diameter 9 m, payload volume about 1,000 m³ (Starship Report). Approximate liftoff mass budget:</p>
    <table><tr><th></th><th>Dry, t</th><th>Propellant, t</th><th>ζ (stage)</th></tr>
    <tr><td>Booster</td><td class="num">≈ 275</td><td class="num">≈ 3,400</td><td class="num">0.93</td></tr>
    <tr><td>Ship (+100 t payload)</td><td class="num">≈ 220</td><td class="num">≈ 1,200</td><td class="num">0.85</td></tr></table>
    <p>Sutton defines the propellant mass fraction ζ = m<sub>p</sub>/m<sub>0</sub> and the mass ratio MR = m<sub>f</sub>/m<sub>0</sub> = 1 − ζ (Ch. 4). The ideal Δv is −c·ln(MR). At ζ = 0.9, ln(1/MR) = ln 10 ≈ 2.3, so even a perfect single stage with c ≈ 3.3 km/s gives only about 7.6 km/s, with no payload and no losses. That is short of the ≈ 9.4 km/s needed. Hence two stages (chapter 8).</p>
    ${W('scalebars')}
    ${src('Starship Report, pp. 9–10. Dry masses are public estimates. Sutton &amp; Biblarz Ch. 4.1 (mass ratio, propellant mass fraction).')}
    ${thread('structure and materials.')}`
},
{
  id: 'anatomy', short: 'Anatomy', when: 'On the pad', title: 'What it is made of', sub: 'Two stages, one stainless-steel skin.', run: '240vh',
  general: `${key('Every part has one job in one phase of flight. Learn the part by asking when it works.')}
    <p>Scroll to pull the rocket apart. <b>Click any label</b> to read what that piece does.</p>
    <ul><li><b>Booster:</b> 33 engines, a methane tank, an oxygen tank, four grid fins for steering home.</li>
    <li><b>Ship:</b> six engines, main tanks, small header tanks for landing, four flaps, black heat-shield tiles, cargo bay in the nose.</li>
    <li><b>Hot-stage ring:</b> the vented joint between them.</li></ul>
    <p><b>Why stainless steel?</b> It is cheap, it gets <i>stronger</i> when chilled by liquid oxygen, it survives heat that would weaken aluminium or carbon fibre, and it is easy to weld and repair. That matters for a rocket meant to fly again and again.</p>
    ${thread('what goes inside those tanks, and why methane.')}`,
  intermediate: `${key('Reusability changed the material choice: steel is heavy, but it tolerates both cryogenic cold and re-entry heat.')}
    <p>The skin is 300-series stainless steel, about $5/kg (Starship Report). Aluminium-lithium and carbon composites are lighter for the same stiffness, but they lose strength at a few hundred °C and need heavy insulation for re-entry. Steel keeps useful strength at much higher temperatures and gains strength at cryogenic temperatures. So the extra skin mass is partly paid back by less thermal protection.</p>
    <p>The ship carries hexagonal <b>heat-shield tiles</b> only on its windward side, the side that faces the airflow in re-entry. Four <b>flaps</b> replace wings and a tail. The booster has <b>grid fins</b> for its return. Click the labels for each part.</p>
    ${myth('“The tiles keep the whole ship cool.” They cover the belly only. The leeward steel sees far less heating because the flow there is in the wake behind the vehicle.')}
    ${thread('propellants: why methane and oxygen, and why so much more oxygen.')}`,
  detail: `${key('Structure is chosen on specific strength across the whole temperature range seen in flight, not at room temperature.')}
    <p>Layout (schematic): booster = engine section (33 Raptors), methane tank, LOX tank with a downcomer through the methane tank, hot-stage ring, grid fins. Ship = engine bay (6 Raptors) and aft flaps, main tanks, header tanks and forward flaps, nose and payload bay.</p>
    <p>Why stainless, per the Starship Report (p. 14): cost (about $5/kg), high melting point (≈ 1,400 °C), durability, ease of manufacture, and strength gain at cryogenic temperature. Austenitic steels do not have the ductile-to-brittle transition that ferritic steels show when cold. Barrel sections are rolled rings about 1.8 m tall, welded into stacks.</p>
    <p>Trade: a tank wall sized for pressure has thickness t ≈ p·r/σ. Steel's higher allowable stress at cryogenic temperature partly offsets its density (≈ 7,900 vs ≈ 2,700 kg/m³ for aluminium).</p>
    ${src('Model geometry from the report’s 9 m / 71 m / 50 m figures. Flap, fin and tank sizes are approximate. Sutton Ch. 6.2 (propellant tanks).')}
    ${thread('propellant choice and mixture ratio.')}`
},
{
  id: 'propellant', short: 'Propellant', when: 'T−45 min: loading', title: 'Why methane and oxygen?', sub: 'Mostly cold liquid oxygen, by a large margin.', run: '190vh',
  general: `${key('A rocket must carry its own oxygen. For every kilogram of methane, Starship carries about 3.6 kg of liquid oxygen.')}
    <p>A jet engine takes oxygen from the air. A rocket cannot, because it flies where there is no air. So it carries <b>liquid oxygen</b> (the oxidiser) as well as <b>liquid methane</b> (the fuel), both chilled until they turn to liquid: oxygen at about −183 °C, methane at about −162 °C.</p>
    <p>Why methane?</p>
    <ul><li><b>It burns cleanly.</b> Kerosene leaves soot and tar inside the engine, which is a problem if you want to fly the same engine many times.</li>
    <li><b>It stores well.</b> Hydrogen gives more push per kilogram, but it is so light that its tanks would be enormous, and it leaks.</li>
    <li><b>It can be made on Mars</b> from carbon dioxide in the air and water ice, so a ship could refuel there.</li></ul>
    ${W('propellant')}
    ${thread('the engine that burns it.')}`,
  intermediate: `${key('Propellant choice is a trade between performance (exhaust velocity) and practicality (density, storage, cleanliness, cost).')}
    <p>Oxygen is the heavy partner: about 3.6 kg for every 1 kg of methane. By volume the split is closer to even, because liquid methane is less than half as dense as liquid oxygen.</p>
    ${work('LOX: 0.78 kg ÷ 1,141 kg/m³ = 0.68 L<br>CH₄: 0.22 kg ÷ 422 kg/m³ = 0.52 L<br><span>→ per kg of propellant: 57% of volume is oxygen, 43% methane</span>')}
    <p>Methane sits between kerosene and hydrogen on performance (Sutton, Table 5-5). Hydrogen gives about 30% more exhaust velocity, but it is only about 70 kg/m³ as a liquid, so its tanks are about six times larger than methane's for the same mass. Large tanks mean more structure and more drag. Methane and oxygen also boil at similar temperatures, which makes a shared tank wall much simpler than with hydrogen (−253 °C).</p>
    ${myth('“More energetic propellant is always better.” Hydrogen’s low density costs so much tank mass on a first stage that dense propellants often win there.')}
    ${W('propellant')}
    ${thread('the Raptor engine and its unusual cycle.')}`,
  detail: `${key('Isp sets the exhaust velocity; bulk density sets tank mass. The best stage design optimises both, not Isp alone.')}
    <p>Sutton, Table 5-5 (p<sub>c</sub> = 1,000 psi, expanded to 1 atm, shifting equilibrium):</p>
    <table><tr><th>Pair</th><th>O/F</th><th>I<sub>sp</sub>, s</th><th>T<sub>c</sub>, K</th></tr>
    <tr><td>O₂ / CH₄</td><td class="num">3.2</td><td class="num">296</td><td class="num">3,526</td></tr>
    <tr><td>O₂ / H₂</td><td class="num">4.02</td><td class="num">389.5</td><td class="num">—</td></tr>
    <tr><td>O₂ / RP-1</td><td class="num">2.24</td><td class="num">300</td><td class="num">—</td></tr></table>
    <p>Sutton (Ch. 7.3): LOX/methane gives lower c* and Isp than LOX/H₂ but higher than LOX/RP-1; liquid methane is about six times denser than liquid hydrogen; it is abundant and low cost, with reproducible properties, and was being studied for Mars vehicles. Raptor runs O/F ≈ 3.6, richer in oxygen than the peak-Isp ratio. A higher O/F raises bulk density and shrinks the fuel tank, at a small Isp cost.</p>
    <p>Bulk density at O/F 3.6: ρ = 1 / (0.783/1141 + 0.217/422) ≈ 830 kg/m³, versus ≈ 360 kg/m³ for LOX/LH₂ at O/F 6. On Mars, the Sabatier reaction CO₂ + 4H₂ → CH₄ + 2H₂O makes methane from local CO₂ and water-derived hydrogen.</p>
    ${W('propellant')}
    ${src('Sutton &amp; Biblarz 9th ed., Ch. 5 (Table 5-5), Ch. 7 (liquid oxygen, liquid methane).')}
    ${thread('engine cycles: how Raptor reaches about 300 bar.')}`
},
{
  id: 'raptor', short: 'Raptor', when: 'T−45 min', title: 'The Raptor engine', sub: 'Every drop of propellant drives a turbine before it burns.', run: '190vh',
  general: `${key('A rocket engine is a pump and a fire. Most of its complexity is in the pumps.')}
    <p>To push hard, an engine must burn propellant at very high pressure: about <b>300 times</b> the air pressure around you. Pumping cold liquid that hard takes enormous power. In Raptor, the pumps are driven by turbines spun by burning a little of the propellant first, in small chambers called <b>preburners</b>.</p>
    <p>Raptor is <b>full-flow staged combustion</b>: <i>all</i> the methane and <i>all</i> the oxygen pass through those turbines and then into the main chamber. Nothing is thrown away. It is the first engine of this type ever to fly.</p>
    <p>Look up under the booster: 33 of them. The inner 13 can swivel to steer; the outer 20 are fixed.</p>
    ${W('engines')}
    ${thread('how that pressure becomes thrust, and why speed costs so much propellant.')}`,
  intermediate: `${key('Chamber pressure buys a compact, powerful engine. The cycle decides how much propellant you waste reaching that pressure.')}
    <p>Every turbopump engine needs power to drive its pumps. That power comes from burning some propellant in a <b>preburner</b> (or gas generator) to spin a turbine. The cycles differ in what happens to that turbine exhaust:</p>
    <ul><li><b>Gas generator</b> (Merlin): the exhaust is dumped overboard, which wastes a few per cent of the propellant.</li>
    <li><b>Staged combustion</b> (RD-180, Space Shuttle main engine): one preburner, and its exhaust is fed into the main chamber.</li>
    <li><b>Full-flow staged</b> (Raptor): two preburners, one fuel-rich and one oxygen-rich. Each runs its own turbine, so both propellants reach the chamber as hot gas.</li></ul>
    <p>Gas-gas mixing is fast and complete. And because <i>all</i> the propellant flows through the turbines, each turbine gets its power from a large, relatively cool gas flow instead of a small, very hot one. Cooler turbines last longer, which matters for reuse.</p>
    ${W('cycles')}${W('engines')}
    ${check('why can’t you just make the chamber pressure higher and higher?', '<p>Pump power rises with pressure × volume flow, so turbines must run hotter and faster. Heat flux into the chamber wall also rises roughly with pressure, making cooling harder. Full-flow staged combustion pushes this limit by splitting the turbine work between two cooler turbines.</p>')}
    ${thread('the thrust equation and the rocket equation.')}`,
  detail: `${key('F = C<sub>F</sub>·p<sub>c</sub>·A<sub>t</sub>: thrust is chamber pressure times throat area times a nozzle factor.')}
    <p>Raptor is a full-flow staged combustion (FFSC) engine. A fuel-rich preburner drives the methane pump, an oxygen-rich preburner drives the LOX pump, and both streams enter the main chamber as gas (Starship Report). Only three FFSC engines have ever been built: the Soviet RD-270 (1960s), Aerojet Rocketdyne's IPD (mid-2000s) and Raptor (2019). Only Raptor has flown.</p>
    <p>A consistency check with this guide's working numbers (approximate public figures):</p>
    ${work('p<sub>c</sub> ≈ 300 bar = 3.0×10⁷ Pa, A<sub>t</sub> ≈ 0.044 m², C<sub>F</sub> ≈ 1.7<br>F ≈ 1.7 × 3.0×10⁷ × 0.044 ≈ 2.24 MN <span>(Raptor 2 ≈ 2.26 MN ✓)</span><br>ṁ = F / (I<sub>sp</sub>·g<sub>0</sub>) = 2.26×10⁶ / (327 × 9.81) ≈ 704 kg/s<br>c* = p<sub>c</sub>·A<sub>t</sub> / ṁ ≈ 1,875 m/s <span>(Sutton Table 5-5, CH₄: 1,835 m/s ✓)</span>')}
    <p>C<sub>F</sub> lies between about 1.0 and 2.0 (Sutton). It depends on the expansion ratio ε = A<sub>e</sub>/A<sub>t</sub> (≈ 34 sea-level bell, ≈ 80 vacuum bell) and on the ambient pressure. Cycle trade-offs are in Sutton §6.6; injectors, regenerative cooling and stability in Ch. 8–9; turbopumps in Ch. 10.</p>
    ${W('cycles')}${W('engines')}
    ${src('Starship Report pp. 11, 14; Sutton Ch. 3 (C<sub>F</sub>, c*), Ch. 6.6 (cycles), Ch. 8 (thrust chambers), Ch. 10 (turbopumps).')}
    ${thread('the thrust equation and the ideal rocket equation.')}`
},
{
  id: 'thrust', short: 'Ignition', when: 'T−5 s to T−0', title: 'Thrust and the rocket equation', sub: 'Throwing mass backwards moves you forward, and every km/s costs exponentially more.', run: '230vh', action: ['ignite', 'Ignite and fly the ascent'],
  general: `${key('Thrust = how much mass you throw out each second × how fast you throw it. Speed gained depends on how much of the rocket is propellant.')}
    <p>A rocket moves by throwing gas out of the back, very hard and very fast: about <b>3 kilometres per second</b>. The gas is pushed backwards, so the rocket is pushed forwards. The rocket needs no air to push against, so it works best in space.</p>
    <p>Here is the catch: to go faster, you need more propellant, but that propellant is heavy and must itself be carried and accelerated. Each extra bit of speed costs more than the one before. This is the <b>rocket equation</b>, the single most important idea in spaceflight.</p>
    <p>The water spraying around the pad is the <b>deluge</b>. It absorbs heat and the sound energy, which is intense enough to damage the pad and the rocket.</p>
    ${myth('“The exhaust pushes against the ground or the air.” It does not need to. The push comes from the gas being thrown backwards (Newton’s third law), which is why rockets work in vacuum.')}
    <p>Press the button to play the ignition and the whole ascent.</p>`,
  intermediate: `${key('Two equations carry most of rocketry: thrust F = ṁ·v<sub>e</sub>, and Δv = v<sub>e</sub>·ln(m<sub>start</sub>/m<sub>end</sub>).')}
    <p><b>Thrust.</b> The 33 Raptors together throw out about 23 tonnes of gas every second at roughly 3.2 km/s:</p>
    ${work('F ≈ ṁ·v<sub>e</sub> ≈ 23,000 kg/s × 3,200 m/s ≈ 74 MN <span>(≈ 7,500 tonnes-force)</span><br>Weight at liftoff ≈ 5,100 t × 9.81 ≈ 50 MN → thrust-to-weight ≈ 1.5')}
    <p><b>Rocket equation.</b> The speed you can gain is the exhaust speed times the natural log of how much lighter you get. Because of the logarithm, doubling the propellant does <i>not</i> double the speed. Try the calculator: hold dry mass fixed and watch the curve flatten.</p>
    ${W('rocketeq')}
    ${check('a stage starts at 1,000 t and burns down to 250 t with v<sub>e</sub> = 3.3 km/s. What Δv?', '<p>Δv = 3.3 × ln(1000/250) = 3.3 × ln 4 ≈ 3.3 × 1.386 ≈ 4.6 km/s. Going from 250 t to 125 t would add only another 3.3 × ln 2 ≈ 2.3 km/s.</p>')}
    ${thread('liftoff: why the first seconds are so slow.')}`,
  detail: `${key('F = ṁ·v<sub>e</sub> + (p<sub>e</sub> − p<sub>a</sub>)·A<sub>e</sub> and Δu = −c·ln(MR). The pressure term is why nozzles are altitude-specific.')}
    <p><b>Thrust</b> (Sutton Ch. 2–3):</p><div class="eq">F = ṁ·v<sub>e</sub> + (p<sub>e</sub> − p<sub>a</sub>)·A<sub>e</sub></div>
    <p>Specific impulse I<sub>sp</sub> = F/(ṁ·g<sub>0</sub>); effective exhaust velocity c = I<sub>sp</sub>·g<sub>0</sub> folds the pressure term in. A sea-level Raptor (A<sub>e</sub> ≈ 1.5 m²) gains p<sub>a</sub>·A<sub>e</sub> ≈ 0.15 MN going from sea level to vacuum. The vacuum bell (A<sub>e</sub> ≈ 3.5 m²) would lose ≈ 0.35 MN at sea level and could suffer flow separation. Slide the altitude:</p>
    ${W('thrustalt')}
    <p><b>Rocket equation</b> (Sutton Eq. 4-5/4-6), from integrating m·du = −c·dm with no external forces:</p>
    <div class="eq">Δu = c·ln(m<sub>0</sub>/m<sub>f</sub>) = −c·ln(MR)</div>
    <p>With gravity and drag (Eq. 4-19/4-20) you subtract ∫g·sinγ dt and ∫D/m dt. Liftoff thrust-to-weight: 74.5 MN / (5,100 t × 9.81) ≈ 1.49, so the initial net acceleration is only ≈ 0.49 g.</p>
    ${W('rocketeq')}
    ${src('Sutton &amp; Biblarz, Ch. 2 (thrust, exhaust velocity), Ch. 3 (nozzles, C<sub>F</sub>), Ch. 4 (Eq. 4-5/4-6, 4-19/4-20).')}
    ${thread('liftoff dynamics and gravity loss.')}`
},
{
  id: 'liftoff', short: 'Liftoff', when: 'T+0 to T+20 s', title: 'Liftoff', sub: 'The first ten seconds are the slowest and the most expensive.', run: '300vh',
  general: `${key('At liftoff, two-thirds of the thrust only holds the rocket up. Every second spent climbing slowly is fuel spent fighting gravity.')}
    <p>The clamps release. The rocket rises slowly, because thrust is only about <b>1.5 times</b> its weight. Two-thirds of the push just cancels gravity, and the remaining third accelerates it.</p>
    <p>Then it speeds up quickly. It burns about <b>23 tonnes of propellant every second</b>, so it gets lighter fast, and the same push accelerates a lighter rocket more. It clears the 146 m tower after about 8 seconds.</p>
    <p>The huge cloud is steam from the water deluge, mixed with dust, thrown outward along the ground by the exhaust. It glows orange from the fire inside it.</p>
    <p>After about 10 seconds the rocket tips a few degrees east, over the Gulf of Mexico. That small tilt starts the turn from going <i>up</i> to going <i>sideways</i>.</p>
    ${thread('the climb, and the moment the air pushes back hardest.')}`,
  intermediate: `${key('Gravity loss accumulates at g per second of vertical flight. That is why low thrust-to-weight is costly and why the rocket turns as soon as it safely can.')}
    ${work('t = 0: a = F/m − g = 74.5 MN / 5,100 t − 9.81 ≈ 14.6 − 9.8 = 4.8 m/s² (0.49 g)<br>Tower clear (146 m): t ≈ √(2·146/4.9) ≈ 7.7 s<br>t = 50 s: m ≈ 5,100 − 50×23 ≈ 3,950 t → a ≈ 18.9 − 9.8 ≈ 9 m/s²')}
    <p>While the rocket climbs straight up it loses <b>9.8 m/s of speed for every second</b> to gravity. Over a whole ascent this <b>gravity loss</b> is about 1.5 km/s, the largest single loss. A rocket with higher thrust-to-weight would lose less, but it would need heavier engines and more structure, so ≈ 1.5 is a compromise.</p>
    <p>The pad takes enormous punishment. A water-cooled steel plate under the mount and the deluge protect the concrete and absorb acoustic energy.</p>
    ${check('why not launch at thrust-to-weight 3 to cut gravity loss?', '<p>You would need about twice as many engines: much more dry mass carried all the way to staging, plus higher loads and drag at low altitude. The Δv saved is smaller than the Δv lost to the extra mass. Real launchers sit between about 1.2 and 1.6.</p>')}
    ${thread('Max-Q and the gravity turn.')}`,
  detail: `${key('dv/dt = F/m − g·sinγ − D/m. At liftoff only the first two terms matter, and they nearly cancel.')}
    <p>At t = 0: F ≈ 74.5 MN, m ≈ 5,100 t, so a = F/m − g ≈ 4.8 m/s². Mass flow ṁ = F/(I<sub>sp</sub>·g<sub>0</sub>) ≈ 74.5×10⁶/(327 × 9.81) ≈ 23.2 t/s, so the vehicle sheds ≈ 0.45% of its mass each second. With constant thrust, acceleration rises as 1/m(t).</p>
    <p>Gravity loss Δv<sub>g</sub> = ∫g·sinγ dt (Sutton Eq. 4-19 term g·t<sub>p</sub> for vertical flight). For the first ≈ 10 s, γ = 90° and the loss is ≈ 98 m/s for a gain of ≈ 50 m/s of actual speed.</p>
    <p>The pitch-over (kick) starts near T+10 s with a few degrees. After that, the thrust vector is held along the velocity vector: a <i>zero-angle-of-attack gravity turn</i>. Gravity bends the trajectory over, and the airframe sees almost no lateral aerodynamic load during the high-q phase.</p>
    ${src('Simulator reference flight: kick at T+10 s, 4.5°, 100 t payload. Sutton Ch. 4.2–4.3. Real flights differ in detail.')}
    ${thread('dynamic pressure and the loss budget.')}`
},
{
  id: 'ascent', short: 'Max-Q', when: 'T+20 s to T+2:30', title: 'Climb and Max-Q', sub: 'Speed rises, air thins: their product peaks once.', run: '300vh',
  general: `${key('The air pushes hardest not at the fastest speed but where speed and air density together are greatest. That moment is Max-Q.')}
    <p>As the rocket climbs it goes faster, but the air gets thinner: about half as dense every 5 km. At first the speed wins and the air pushes harder. Higher up, the thinning air wins. In between there is a single peak: <b>maximum dynamic pressure</b>, or <b>Max-Q</b>, about one minute into flight.</p>
    <p>Max-Q is when the rocket is squeezed and shaken the most. The engines throttle down slightly to get through it, then back up.</p>
    <p>Meanwhile the rocket keeps leaning over. Gravity does most of the turning: the rocket points along its own path, and gravity bends the path toward horizontal.</p>
    ${W('maxq')}
    ${thread('separation: the booster has done its job.')}`,
  intermediate: `${key('q = ½ρv² peaks once. And the real cost of the climb is gravity, not drag.')}
    <p>Dynamic pressure q = ½ρv² is the pressure of the oncoming air. Density ρ falls by about half every 5 km while v keeps growing, so q rises, peaks and falls toward zero above about 40 km. The chart is computed live by the same model that runs the flight above.</p>
    ${W('maxq')}
    <p>Where does the Δv go? The engines provide about 9.7 km/s of ideal Δv across both stages, but the ship arrives with about 7.8 km/s. The difference is the loss budget:</p>
    ${W('budget')}
    <p>The booster steers by tilting (gimballing) its 13 central engines a few degrees. Because the rocket flies nearly nose-first through Max-Q, sideways air loads stay small.</p>
    ${myth('“Drag is the main enemy on the way up.” For a heavy rocket like this, drag costs tens of m/s. Gravity costs well over 1 km/s.')}
    ${thread('hot staging and the boostback.')}`,
  detail: `${key('Losses are the integrals of g·sinγ, D/m and the steering term (1 − cos α)·F/m. Their sum is the gap between ideal and achieved Δv.')}
    <p>q = ½ρv², drag D = q·C<sub>D</sub>(M)·S with S = π·4.5² ≈ 64 m². The model's exponential atmosphere ρ = 1.225·e<sup>−h/7.5 km</sup> puts the peak in this simulation at ≈ 28 kPa near T+52 s (real flights peak later, near T+60–70 s, because they throttle differently).</p>
    ${W('maxq')}
    <p>Loss decomposition, with Sutton Eq. 4-19/4-20 integrated over the flight:</p>
    <div class="eq">Δv<sub>achieved</sub> = Σ c<sub>i</sub>ln(1/MR<sub>i</sub>) − ∫g·sinγ dt − ∫D/m dt − ∫(F/m)(1 − cos α) dt</div>
    ${W('budget')}
    <p>Thrust vector control (Sutton Ch. 18): the 13 gimballing engines steer by a few degrees. Structural loads scale with q·α (the normal-force coefficient times dynamic pressure), so ascent guidance keeps α ≈ 0 through high q. A throttle bucket near Max-Q lowers peak q at a small gravity-loss cost; toggle it in chapter 10.</p>
    ${src('Sutton Ch. 4.2 (forces in the atmosphere), Eq. 4-19/4-20; Ch. 18 (thrust vector control).')}
    ${thread('staging: why throwing away 2,000 t of empty booster helps.')}`
},
{
  id: 'staging', short: 'Staging', when: 'T+2:40', title: 'Hot staging and the boostback', sub: 'The ship lights its engines before it lets go.', run: '280vh',
  general: `${key('Staging works because you stop carrying empty tanks. Then the booster turns around and flies home.')}
    <p>After about two and a half minutes the booster has used most of its propellant. Its tanks are now mostly empty steel, and pushing that dead weight any further wastes energy. So the rocket splits in two.</p>
    <p>Starship does this unusually: the ship lights its own engines <b>while still attached</b>, and the exhaust escapes through the vented ring. This is <b>hot staging</b>. There is no coasting gap, so no speed is lost and the ship's propellant stays settled at the bottom of its tanks.</p>
    <p>The booster then flips around with small gas thrusters and its grid fins, and fires some engines to reverse its direction: the <b>boostback burn</b>. It heads back toward the tower to be caught (chapter 12).</p>
    ${W('staging')}
    ${thread('orbit: what “sideways fast” really means.')}`,
  intermediate: `${key('Each stage gets its own rocket equation with a fresh, better mass ratio. Add the stages up and you reach orbit; one stage alone cannot.')}
    ${work('Booster burn: 5,100 t → ≈ 2,000 t at c ≈ 3.2 km/s → Δv ≈ 3.2 × ln(2.55) ≈ 3.0 km/s<br>Ship burn: ≈ 1,420 t → ≈ 220 t at c ≈ 3.6 km/s → Δv ≈ 3.6 × ln(6.45) ≈ 6.7 km/s<br><span>Total ideal ≈ 9.7 km/s, above the ≈ 9.4 km/s needed</span>')}
    <p>Compare one big stage with the same propellant: it would end with the booster's empty tanks still attached (≈ 800 t final mass). Its Δv would be about 3.3 × ln(5,100/800) ≈ 6.1 km/s, nowhere near orbit. The widget shows this.</p>
    ${W('staging')}
    <p><b>Why hot staging?</b> Engines need liquid, not bubbles, at their pump inlets. During a coast, propellant floats free in the tanks. While the booster is still pushing, the ship's propellant stays pressed to the bottom, so the ship can light safely without separate settling thrusters.</p>
    <p>The booster keeps about 300 t of propellant for its boostback and landing burns. That reserve is propellant the stack did not use going up: the price of reuse.</p>
    ${thread('orbital mechanics: why 7.8 km/s.')}`,
  detail: `${key('Multistage Δv: Δu = Σ c<sub>i</sub>·ln(1/MR<sub>i</sub>) (Sutton Eq. 4-36). Staging resets the mass ratio by dropping structure.')}
    <p>Booster: m<sub>0</sub> ≈ 5,100 t, m<sub>f</sub> ≈ 2,000 t (ship + payload + booster dry + boostback reserve), c ≈ 3.2 km/s → ≈ 3.0 km/s ideal. Ship: m<sub>0</sub> ≈ 1,420 t, m<sub>f</sub> ≈ 220 t, c ≈ 3.5–3.7 km/s (mixed sea-level and vacuum Raptors) → ≈ 6.7 km/s. Total ≈ 9.7 km/s ideal, against ≈ 9.4 km/s needed after losses.</p>
    ${W('staging')}
    <p>Sutton Ch. 4.7 covers stage optimisation. For equal c and structural ratio, the payload fraction is maximised when each stage provides roughly equal Δv. Starship deliberately departs from this: the booster gives only ≈ 3 km/s so that it stages low and slow enough (≈ 2 km/s, ≈ 70 km) to return to the launch site.</p>
    <p>Boostback must cancel the horizontal velocity at staging (≈ 1.5 km/s in this model) and add a return component. That costs propellant the ascent does not use: return-to-launch-site reuse trades payload for recovery.</p>
    ${src('Sutton Ch. 4.7 (multistage vehicles, stage separation), Eq. 4-36.')}
    ${thread('circular orbit speed, energy, and why test flights stay suborbital.')}`
},
{
  id: 'orbit', short: 'Orbit', when: 'T+2:40 to T+8:30', title: 'Orbit: going sideways, fast', sub: 'Space is not far up. Orbit is about going fast sideways.', run: '300vh',
  general: `${key('In orbit you are still falling. You are moving sideways so fast that the ground curves away beneath you as fast as you fall.')}
    <p>Space begins only about 100 km up, a distance you could drive in about an hour. Getting that high is the easy part. To <b>stay</b> up, you need about <b>28,000 km/h</b> of sideways speed. At that speed the Earth's surface curves away beneath you just as fast as you fall toward it.</p>
    <p>That is why the ship keeps burning for about six more minutes after separation: it is building sideways speed, not height.</p>
    <p>Try Newton's cannon below: fire a cannonball faster and faster from a very high mountain, and find the speed where it never lands.</p>
    ${W('orbit')}
    ${myth('“Astronauts float because there is no gravity up there.” At 400 km gravity is still about 90% of its surface value. They float because they and their spacecraft are falling together.')}
    ${thread('re-entry: getting rid of all that speed.')}`,
  intermediate: `${key('Orbital speed comes from balancing gravity against the curvature of a circular path: v = √(GM/r).')}
    ${work('v = √(μ/r) = √(3.986×10¹⁴ / 6.471×10⁶) ≈ 7,850 m/s at 100 km<br>One orbit: 2πr / v ≈ 2π × 6,471 km / 7.85 km/s ≈ 86 minutes')}
    <p>The rocket spent about 9.4 km/s of Δv to deliver 7.8 km/s, because gravity, drag and steering took the rest (chapter 7). The ship fires until its tanks are almost empty, at about T+8:30.</p>
    <p>Below 7.85 km/s, the path still curves toward Earth faster than the surface curves away, so you come back down. Above about 11 km/s you escape Earth entirely. Use the slider to see both.</p>
    ${W('orbit')}
    ${check('why do rockets launch eastward?', '<p>The Earth spins eastward. At Starbase (26° N) the ground already moves at about 0.42 km/s, which the rocket gets for free. Our model ignores this, which makes it slightly pessimistic.</p>')}
    ${thread('re-entry and the blunt-body idea.')}`,
  detail: `${key('Specific orbital energy ε = v²/2 − μ/r fixes the semi-major axis. Perigee radius decides whether the trajectory clips the atmosphere.')}
    <p>Circular speed v = √(μ/r), μ = 3.986×10¹⁴ m³/s². At r = 6,471 km (100 km altitude) v ≈ 7.85 km/s. For speed v at radius r with flight-path angle zero: ε = v²/2 − μ/r, h = r·v, a = −μ/(2ε), e = √(1 + 2εh²/μ²), r<sub>p</sub> = a(1 − e), r<sub>a</sub> = a(1 + e). If r<sub>p</sub> is inside the atmosphere, drag decays the orbit within a revolution.</p>
    <p>Flight tests have flown deliberately suborbital: perigee inside the atmosphere, so a vehicle that cannot relight its engines still re-enters over the planned ocean area rather than staying in orbit as debris. A small orbit-raising burn then makes the orbit stable.</p>
    ${W('orbit')}
    ${src('Sutton Ch. 4.4 (space flight, elliptical orbits), 4.5 (manoeuvres). Earth rotation (≈ 0.42 km/s at 26° N) is neglected in this model.')}
    ${thread('fly the ascent yourself.')}`
},
{
  id: 'simulator', short: 'Fly it', when: 'Your flight', title: 'Fly it yourself', sub: 'Change one thing at a time. See what breaks.', run: '230vh',
  general: `${key('Every number you have seen came from this model. Now you change the inputs.')}
    <p>Change a setting and press <b>Run flight</b>. The chart shows altitude (blue) and speed (amber); the line marks staging.</p>
    <ul><li><b>Pitch kick:</b> how far the rocket tips over at the start. Too small and it climbs too steeply and wastes fuel on gravity. Too big and it flattens out while still in thick air.</li>
    <li><b>Payload:</b> heavier cargo means less speed at the end.</li></ul>
    ${W('sim')}
    ${thread('coming home through the atmosphere.')}`,
  intermediate: `${key('Ascent design is a balance between gravity loss (turn too late) and drag and heating (turn too early).')}
    <p>Experiments to try, one change at a time:</p>
    <ul><li><b>Payload 100 t → 150 t.</b> The ship no longer reaches orbit. This model uses first-generation numbers; the 150 t goal relies on lighter structure and Raptor 3.</li>
    <li><b>Kick 4.5° → 1°.</b> The rocket goes too high, too slowly. Watch the gravity loss in the note grow.</li>
    <li><b>Kick 4.5° → 8°.</b> It turns flat while the air is thick. Drag and dynamic pressure rise, and it may fail.</li>
    <li><b>Max-Q throttle off.</b> Peak q rises a little, and the losses barely change.</li>
    <li><b>Drag off.</b> Compare final speeds: drag is the smaller loss.</li></ul>
    ${W('sim')}
    ${thread('re-entry.')}`,
  detail: `${key('A point-mass model already shows the main sensitivities: payload ↔ Δv, kick angle ↔ gravity and drag loss, throttle ↔ q<sub>max</sub>.')}
    <p>Model: point mass in the orbital plane, Earth-centred polar coordinates, exponential atmosphere ρ = 1.225·e<sup>−h/7.5 km</sup>, C<sub>D</sub>(M) peaking near Mach 1.15, per-engine thrust F = ṁ·v<sub>e,vac</sub> − p<sub>a</sub>·A<sub>e</sub>. Stage 1: gravity turn after a kick. Stage 2: closed-loop steering that drives the climb rate to zero at cut-off. Not modelled: Earth rotation, wind, structural dynamics, separation transients, engine-out.</p>
    <p>The note under the chart reports the three loss integrals. Check that ideal Δv − losses ≈ final speed.</p>
    ${W('sim')}
    ${src('Source code: site/js/sim.js. Constants follow the working numbers listed in the project notes.')}
    ${thread('hypersonic re-entry.')}`
},
{
  id: 'reentry', short: 'Re-entry', when: 'Entry interface to landing', title: 'Re-entry: the belly flop', sub: 'A blunt body in a hypersonic flow.', run: '320vh', action: ['reentry', 'Play re-entry'],
  general: `${key('To come home, the ship must shed almost all its orbital energy as heat. The trick is to put that heat into the air, not into the ship.')}
    <p>The ship returns at about <b>27,000 km/h</b>. Its energy of motion is about the same as 1,000 tonnes of TNT. All of it must be removed before landing.</p>
    <p>Engines cannot do that: it would take more propellant than the ship carried up. So it uses the atmosphere as a brake. The ship falls <b>belly-first</b>, presenting its broad, tiled side to the air. In front of it a <b>shock wave</b> forms, where the air is compressed so violently that it glows as <b>plasma</b>, the pink-orange light around the ship.</p>
    <p>A blunt, broad shape pushes the shock wave away from its surface, so most of the heat stays in the air and flows away. The tiles only have to handle what is left.</p>
    <p>Near the ground the ship flips upright, relights its engines, and lands or is caught.</p>
    ${W('terminal')}
    ${myth('“The heat comes from friction with the air.” It comes mainly from compression: air piled up in front of the vehicle in the shock layer is heated to thousands of degrees.')}
    ${thread('the catch.')}`,
  intermediate: `${key('Blunt is better. A blunt body creates a strong, detached shock that dumps most of the energy into the air, and lots of drag to slow down high up, where the air is thin.')}
    ${work('Kinetic energy at entry: ½ × 150 t × (7,500 m/s)² ≈ 4.2×10¹² J ≈ 1,000 t TNT<br>Belly area ≈ 9 m × 50 m ≈ 450 m² vs nose-first ≈ 64 m²')}
    <p>Harvey Allen's insight in the 1950s was that a sharp nose keeps the shock attached and the hot gas against the skin, while a blunt nose stands the shock off. That is why capsules and the Space Shuttle are blunt, and why Starship re-enters belly-first. More drag area also means it slows down higher, in thinner air, where heating per square metre is lower.</p>
    <p>Lower down, the belly-first ship falls at only about 70–100 m/s. That is its terminal speed, where drag equals weight. Nose-first it would be about three times faster, and the landing burn would need far more propellant. Use the widget:</p>
    ${W('terminal')}
    <p>The flaps steer the fall like a skydiver's arms and legs: more drag at one end pitches that end up.</p>
    ${thread('the landing burn and the tower catch.')}`,
  detail: `${key('Stagnation heating scales roughly as √(ρ/R<sub>n</sub>)·v³: a large effective nose radius R<sub>n</sub> and high-altitude deceleration (low ρ) both reduce peak heat flux.')}
    <p>Harvey Allen's blunt-body concept (NACA Report 1381, 1958) underlies every successful re-entry vehicle (Anderson, Ch. 1, Fig. 1.10). A detached bow shock converts the vehicle's kinetic energy into thermal energy of the shock layer, and most of it is convected away in the wake.</p>
    <p>Normal-shock stagnation temperature for a calorically perfect gas (Anderson Ch. 8): T<sub>0</sub> = T<sub>∞</sub>(1 + (γ−1)/2·M²). At 7 km/s (M ≈ 24) with T<sub>∞</sub> ≈ 230 K this gives ≈ 26,000 K. Real values are far lower, ≈ 6,000–11,000 K, because dissociation of O₂ and N₂ and then ionisation absorb energy (real-gas effects, Anderson Ch. 14). The HUD therefore labels its number “ideal gas”. The same free electrons cause the radio blackout the Space Shuttle experienced.</p>
    ${W('heat')}
    <p>Terminal velocity v<sub>t</sub> = √(2mg / (ρ·C<sub>D</sub>·A)): for 150 t at sea level, broadside (A ≈ 450 m², C<sub>D</sub> ≈ 1.0) gives ≈ 73 m/s; tail-first (A ≈ 64 m², C<sub>D</sub> ≈ 0.8) gives ≈ 217 m/s. Tile limit is quoted at ≈ 1,400 °C. Heat-flux scaling is the Sutton–Graves correlation, a standard engineering approximation.</p>
    ${W('terminal')}
    ${src('Anderson, Fundamentals of Aerodynamics, Ch. 1 (blunt body), Ch. 8 (normal shocks, T<sub>0</sub>), Ch. 14 (hypersonic flow).')}
    ${thread('the catch.')}`
},
{
  id: 'catch', short: 'Catch', when: 'Booster return, T+6:30', title: 'The catch', sub: 'No landing legs. The tower is the landing gear.', run: '300vh', action: ['catch', 'Play booster catch'],
  general: `${key('Landing legs weigh tonnes and fly on every mission. Catching the booster with the tower moves that weight onto the ground.')}
    <p>The booster falls back toward Starbase, steering with its grid fins. Close to the ground it relights <b>13 engines</b>, then shuts down all but <b>3</b>, slowing almost to a hover beside the tower. Two huge arms, the <b>chopsticks</b>, close around it, and it settles onto them on small catch pins.</p>
    <p>This saves the weight of landing legs and puts the booster right back where it is needed, ready to be stacked again. It was first done on Starship's fifth flight test (October 2024).</p>
    <p>The ship is designed to be caught the same way.</p>
    ${thread('the sources behind every number, and where to read further.')}`,
  intermediate: `${key('An empty booster is light and its engines are strong. The landing burn is a fight to throttle down far enough, not up.')}
    ${work('Booster at catch ≈ 300 t → weight ≈ 2.9 MN<br>One Raptor at full thrust ≈ 2.26 MN, so one engine cannot quite hold it up<br>Three Raptors at ≈ 40–45% throttle ≈ 2.7–3.1 MN ≈ weight → near-hover is possible')}
    <p>That is why the burn starts on 13 engines, to kill most of the speed quickly and limit gravity loss, then drops to 3 for the fine control needed to line up with the arms. Every second spent hovering costs propellant, so the approach is timed to arrive at nearly zero speed just as the arms close.</p>
    ${myth('“Landing a rocket is like landing a helicopter.” A helicopter can hover indefinitely. Even on three throttled-down Raptors the booster burns close to a tonne of propellant every second, so it must arrive and stop almost at once.')}
    ${thread('sources and further reading.')}`,
  detail: `${key('Landing burn: drive velocity and altitude error to zero together, using a thrust-to-weight that can be throttled to about 1 at near-empty mass.')}
    <p>Booster sequence: boostback burn, coast, grid-fin guided descent, landing burn (13 engines, then 3), near-hover, arm closure. Booster mass at catch in this model is ≈ 300–350 t.</p>
    <p>Minimum thrust is the constraint. T/W for one engine at 300 t ≈ 2.26/2.94 ≈ 0.77, and for three at full thrust ≈ 2.3. With a deep-throttle capability near 40% (public estimate), three engines reach T/W ≈ 0.9–1.05 and can null the velocity. The final phase uses closed-loop guidance to put the catch pins between the arms within small tolerances. The arms are then compliant: they move to absorb residual motion.</p>
    <p>Landing Δv is small compared with ascent, but it is bought at the vehicle's lowest mass with no margin to spare. Every kilogram of landing propellant was carried through the whole ascent.</p>
    ${src('Starship Report, p. 10 (catch description). Throttle range is a public estimate.')}
    ${thread('sources and further reading.')}`
},
{
  id: 'library', short: 'Sources', when: 'Further study', title: 'Where this comes from', sub: 'Books, report, videos, and the words to search for.', run: '140vh',
  general: `<p>Everything here was built from two textbooks, an industry report on Starship, an environmental document for the launch site, and launch videos.</p>
    <h4>Words worth knowing</h4>
    <dl class="gloss"><dt>Δv</dt><dd>“Delta-v”: the change in speed a rocket can produce. The currency of spaceflight.</dd>
    <dt>Isp</dt><dd>Specific impulse: how efficiently an engine uses propellant. Higher is better.</dd>
    <dt>Max-Q</dt><dd>Moment of maximum air pressure on the rocket.</dd>
    <dt>MECO</dt><dd>Main engine cut-off (booster). SECO is the ship's cut-off.</dd>
    <dt>Gimbal</dt><dd>Tilting an engine to steer.</dd>
    <dt>Plasma</dt><dd>Gas so hot that its atoms lose electrons and glow.</dd></dl>
    ${W('library')}`,
  intermediate: `<p>To go deeper, read in this order. Each step builds on the one before:</p>
    <ol><li>Sutton, Ch. 2–3: thrust, exhaust velocity, nozzles (chapters 4–5 here)</li>
    <li>Sutton, Ch. 4: flight performance, gravity loss, staging, orbits (chapters 6–9)</li>
    <li>Sutton, Ch. 6 and 10: engine cycles, turbopumps (chapter 4)</li>
    <li>Anderson, Ch. 1 and 8: blunt bodies, shocks (chapter 11)</li></ol>
    <h4>Glossary</h4>
    <dl class="gloss"><dt>Δv</dt><dd>Velocity change available from the rocket equation, c·ln(m<sub>0</sub>/m<sub>f</sub>).</dd>
    <dt>Isp, c</dt><dd>Specific impulse (s) and effective exhaust velocity c = I<sub>sp</sub>·g<sub>0</sub>.</dd>
    <dt>O/F</dt><dd>Oxidiser-to-fuel mass ratio (≈ 3.6 for Raptor).</dd>
    <dt>q</dt><dd>Dynamic pressure ½ρv².</dd>
    <dt>Gravity turn</dt><dd>Ascent with thrust along velocity; gravity bends the path.</dd>
    <dt>Hot staging</dt><dd>Upper stage ignites before separation.</dd>
    <dt>Terminal velocity</dt><dd>Speed where drag equals weight.</dd></dl>
    ${W('library')}`,
  detail: `<table><tr><th>Source</th><th>Used for</th></tr>
    <tr><td>Sutton &amp; Biblarz, Rocket Propulsion Elements (9th ed., 2017)</td><td>Eq. 4-5/4-6 rocket equation, Eq. 4-19/20 gravity and drag, Eq. 4-36 staging, Table 5-5 propellants, Ch. 3 C<sub>F</sub> and c*, §6.6 cycles, Ch. 18 TVC, Ch. 20 plumes</td></tr>
    <tr><td>Anderson, Fundamentals of Aerodynamics (6th ed.)</td><td>Blunt-body re-entry (Ch. 1), normal shocks and stagnation temperature (Ch. 8), hypersonic flow (Ch. 14)</td></tr>
    <tr><td>The Starship Report (Payload Research, Jan 2024)</td><td>Dimensions, engine counts, thrust, payload, materials, architecture</td></tr>
    <tr><td>SpaceX LC-39A Final EIS, Vol. II App. B.1</td><td>Launch-site context (wildlife consultation; not used for engineering)</td></tr>
    <tr><td>NASA Visible Earth: Blue Marble, Black Marble, cloud and water maps</td><td>The Earth seen from altitude (public domain imagery)</td></tr></table>
    <h4>Glossary</h4>
    <dl class="gloss"><dt>c*</dt><dd>Characteristic velocity p<sub>c</sub>A<sub>t</sub>/ṁ: combustion efficiency, independent of the nozzle.</dd>
    <dt>C<sub>F</sub></dt><dd>Thrust coefficient F/(p<sub>c</sub>A<sub>t</sub>): nozzle performance, ≈ 1–2.</dd>
    <dt>ε</dt><dd>Nozzle area ratio A<sub>e</sub>/A<sub>t</sub>.</dd>
    <dt>MR, ζ</dt><dd>Mass ratio m<sub>f</sub>/m<sub>0</sub>; propellant fraction m<sub>p</sub>/m<sub>0</sub>.</dd>
    <dt>FFSC</dt><dd>Full-flow staged combustion.</dd>
    <dt>T<sub>0</sub></dt><dd>Stagnation temperature; ideal-gas value over-predicts at hypersonic speed.</dd></dl>
    ${W('library')}
    ${src('Figures are approximate and the vehicle has changed since the 2024 report. Check current SpaceX data for exact values.')}`
},
];
