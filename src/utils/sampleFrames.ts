import { Frame } from '../types/storyboard';

/**
 * Creates 4 initial classic animation storyboard frames drawn programmatically
 * onto canvas, featuring classical rough Col-Erase blue pencils and clean graphite/ink lines.
 */
export function generateInitialStoryboardFrames(): Frame[] {
  const width = 960;
  const height = 540;

  const createFrameCanvas = (drawFn: (ctx: CanvasRenderingContext2D) => void): string => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.clearRect(0, 0, width, height);
    drawFn(ctx);
    return canvas.toDataURL('image/png');
  };

  // Frame 1: Anticipation - Character coiled low, ready to spring
  const frame1Data = createFrameCanvas((ctx) => {
    // Ground line
    ctx.strokeStyle = '#c4c8d1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(100, 440);
    ctx.lineTo(860, 440);
    ctx.stroke();

    // Rough blue construction lines (Animators Col-Erase blue)
    ctx.strokeStyle = 'rgba(70, 130, 200, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Action arc
    ctx.arc(360, 400, 60, 0, Math.PI * 2);
    ctx.moveTo(340, 320);
    ctx.quadraticCurveTo(460, 200, 720, 220); // Planned jump trajectory
    ctx.stroke();

    // Center of gravity crosshair
    ctx.beginPath();
    ctx.moveTo(330, 390);
    ctx.lineTo(390, 390);
    ctx.moveTo(360, 360);
    ctx.lineTo(360, 420);
    ctx.stroke();

    // Clean ink character: crouched hero
    ctx.strokeStyle = '#222224';
    ctx.fillStyle = '#222224';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Head / Face
    ctx.beginPath();
    ctx.arc(360, 330, 28, 0, Math.PI * 2);
    ctx.stroke();

    // Mask / eyes
    ctx.beginPath();
    ctx.moveTo(350, 326);
    ctx.lineTo(358, 328);
    ctx.moveTo(366, 328);
    ctx.lineTo(374, 326);
    ctx.stroke();

    // Determined brow
    ctx.beginPath();
    ctx.moveTo(348, 320);
    ctx.lineTo(376, 323);
    ctx.stroke();

    // Torso coiled low
    ctx.beginPath();
    ctx.moveTo(360, 358);
    ctx.quadraticCurveTo(340, 390, 355, 410);
    ctx.stroke();

    // Coiled spring legs
    ctx.beginPath();
    ctx.moveTo(345, 395);
    ctx.quadraticCurveTo(310, 410, 325, 440); // Left leg
    ctx.moveTo(355, 400);
    ctx.quadraticCurveTo(385, 420, 380, 440); // Right leg
    ctx.stroke();

    // Arms back in anticipation
    ctx.beginPath();
    ctx.moveTo(348, 370);
    ctx.quadraticCurveTo(300, 360, 280, 385);
    ctx.moveTo(365, 370);
    ctx.quadraticCurveTo(400, 380, 415, 400);
    ctx.stroke();

    // Motion anticipation speed ticks
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(270, 410);
    ctx.lineTo(260, 425);
    ctx.moveTo(280, 420);
    ctx.lineTo(275, 435);
    ctx.stroke();
  });

  // Frame 2: Launch / Contact burst - explosive stretch frame
  const frame2Data = createFrameCanvas((ctx) => {
    // Ground line & dust burst
    ctx.strokeStyle = '#c4c8d1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(100, 440);
    ctx.lineTo(860, 440);
    ctx.stroke();

    // Rough blue trajectory arc
    ctx.strokeStyle = 'rgba(70, 130, 200, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(340, 440);
    ctx.quadraticCurveTo(460, 200, 720, 220);
    // Force lines
    ctx.moveTo(320, 450);
    ctx.lineTo(290, 470);
    ctx.moveTo(370, 450);
    ctx.lineTo(400, 470);
    ctx.stroke();

    // Stretched dynamic body (Classical animation principle: Squash & Stretch)
    ctx.strokeStyle = '#222224';
    ctx.lineWidth = 3.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Stretched torso & head angled up-right
    ctx.beginPath();
    // Head tilted upwards along arc
    ctx.arc(430, 240, 26, 0, Math.PI * 2);
    ctx.stroke();

    // Focused eye looking forward
    ctx.beginPath();
    ctx.moveTo(438, 236);
    ctx.lineTo(448, 238);
    ctx.moveTo(436, 230);
    ctx.lineTo(448, 232);
    ctx.stroke();

    // Stretched spine
    ctx.beginPath();
    ctx.moveTo(420, 264);
    ctx.quadraticCurveTo(390, 320, 360, 380);
    ctx.stroke();

    // Legs thrusting down behind
    ctx.beginPath();
    ctx.moveTo(370, 370);
    ctx.lineTo(340, 430); // Lead trailing foot
    ctx.moveTo(360, 375);
    ctx.lineTo(330, 420);
    ctx.stroke();

    // Arms reaching up into the jump
    ctx.beginPath();
    ctx.moveTo(418, 280);
    ctx.quadraticCurveTo(460, 250, 490, 220); // Reaching arm
    ctx.moveTo(410, 285);
    ctx.quadraticCurveTo(380, 270, 370, 250);
    ctx.stroke();

    // Dust poof at launch point
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(330, 435, 12, 0, Math.PI);
    ctx.arc(360, 435, 16, 0, Math.PI);
    ctx.stroke();
  });

  // Frame 3: Apex - Floating at peak height, dynamic silhouette
  const frame3Data = createFrameCanvas((ctx) => {
    // Distant horizon
    ctx.strokeStyle = '#d5d8de';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(100, 440);
    ctx.lineTo(860, 440);
    ctx.stroke();

    // Rough blue action lines
    ctx.strokeStyle = 'rgba(70, 130, 200, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(340, 440);
    ctx.quadraticCurveTo(550, 160, 720, 440); // Parabolic flight path
    ctx.stroke();

    // Character at apex of leap
    ctx.strokeStyle = '#222224';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Head
    ctx.beginPath();
    ctx.arc(540, 175, 26, 0, Math.PI * 2);
    ctx.stroke();

    // Determined gaze down toward landing target
    ctx.beginPath();
    ctx.moveTo(548, 175);
    ctx.lineTo(556, 180);
    ctx.stroke();

    // Curved airborne torso
    ctx.beginPath();
    ctx.moveTo(535, 200);
    ctx.quadraticCurveTo(530, 235, 545, 260);
    ctx.stroke();

    // Tuck-up legs in midair
    ctx.beginPath();
    ctx.moveTo(540, 255);
    ctx.quadraticCurveTo(510, 270, 520, 295);
    ctx.moveTo(548, 255);
    ctx.quadraticCurveTo(570, 275, 555, 300);
    ctx.stroke();

    // Cape / Scarf billowing behind
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(525, 205);
    ctx.quadraticCurveTo(450, 195, 410, 230);
    ctx.quadraticCurveTo(450, 240, 525, 220);
    ctx.stroke();

    // Arms balanced for descent
    ctx.beginPath();
    ctx.moveTo(530, 210);
    ctx.lineTo(495, 215);
    ctx.moveTo(545, 210);
    ctx.lineTo(580, 225);
    ctx.stroke();
  });

  // Frame 4: Landed / Impact - Solid contact pose with dust impact
  const frame4Data = createFrameCanvas((ctx) => {
    // Ground line
    ctx.strokeStyle = '#c4c8d1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(100, 440);
    ctx.lineTo(860, 440);
    ctx.stroke();

    // Blue impact shockwaves
    ctx.strokeStyle = 'rgba(70, 130, 200, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(710, 440, 90, 20, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Landed superhero three-point contact pose
    ctx.strokeStyle = '#222224';
    ctx.lineWidth = 3.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Head looking up sharply
    ctx.beginPath();
    ctx.arc(710, 345, 26, 0, Math.PI * 2);
    ctx.stroke();

    // Triumphant smirk
    ctx.beginPath();
    ctx.moveTo(715, 350);
    ctx.quadraticCurveTo(724, 354, 728, 348);
    ctx.stroke();

    // Torso angled down
    ctx.beginPath();
    ctx.moveTo(710, 370);
    ctx.lineTo(700, 410);
    ctx.stroke();

    // One fist planted firmly on the ground (contact)
    ctx.beginPath();
    ctx.moveTo(715, 380);
    ctx.lineTo(745, 415);
    ctx.lineTo(745, 440);
    ctx.stroke();

    // Other arm back
    ctx.beginPath();
    ctx.moveTo(700, 380);
    ctx.lineTo(665, 395);
    ctx.stroke();

    // Deep squat legs
    ctx.beginPath();
    ctx.moveTo(695, 405);
    ctx.quadraticCurveTo(660, 420, 670, 440); // Back foot flat
    ctx.moveTo(705, 408);
    ctx.quadraticCurveTo(730, 425, 720, 440); // Front knee bent
    ctx.stroke();

    // Impact dust billow
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(640, 435, 18, 0, Math.PI * 1.5, true);
    ctx.arc(775, 435, 20, Math.PI * 1.5, Math.PI * 3);
    ctx.stroke();
  });

  return [
    {
      id: 'frame-1',
      sceneNumber: '01',
      panelNumber: '01',
      shotNumber: '01',
      actionNotes: 'WIDE SHOT. Hero gathers momentum in deep crouch anticipation.',
      dialogueNotes: '"Wait for the gust..."',
      durationSec: 1.0,
      canvasData: frame1Data,
      timestamp: Date.now() - 3000,
    },
    {
      id: 'frame-2',
      sceneNumber: '01',
      panelNumber: '02',
      shotNumber: '01',
      actionNotes: 'Dynamic launch! Extreme squash-and-stretch upward trajectory.',
      dialogueNotes: '[Foot thrust sounds, dust burst]',
      durationSec: 0.5,
      canvasData: frame2Data,
      timestamp: Date.now() - 2000,
    },
    {
      id: 'frame-3',
      sceneNumber: '01',
      panelNumber: '03',
      shotNumber: '02',
      actionNotes: 'Peak apex. Silhouette floats against sky, scarf catches crosswind.',
      dialogueNotes: '',
      durationSec: 1.0,
      canvasData: frame3Data,
      timestamp: Date.now() - 1000,
    },
    {
      id: 'frame-4',
      sceneNumber: '01',
      panelNumber: '04',
      shotNumber: '03',
      actionNotes: 'Solid 3-point superhero landing. Shockwave dust expands outward.',
      dialogueNotes: '"Landed clean."',
      durationSec: 1.5,
      canvasData: frame4Data,
      timestamp: Date.now(),
    },
  ];
}
