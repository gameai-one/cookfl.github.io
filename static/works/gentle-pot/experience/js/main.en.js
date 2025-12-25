// A Gentle Pot - interactive poem core logic

const chapters = [
    {
        id: 'spring',
        image: '../assets/images/Spring_Lake.png',
        overlayClass: 'overlay-spring',
        poems: [
            'Clear water',
            'like crystal',
            'fragile'
        ]
    },
    {
        id: 'winter',
        image: '../assets/images/Winter_Quarry.png',
        overlayClass: 'overlay-winter',
        poems: [
            'Some things',
            'are cold as stone',
            'refuse to melt'
        ]
    },
    {
        id: 'autumn',
        image: '../assets/images/Autumn_Temple.png',
        overlayClass: 'overlay-autumn',
        poems: [
            'Home',
            'is a warm light',
            'a pot of rice simmered slowly'
        ]
    }
];

let currentChapterIndex = 0;
let currentPoemIndex = 0;
let isTransitioning = false;
let isEnding = false;
let canRestart = false;
let isRestarting = false;

// DOM elements
const bgImage = document.getElementById('background-image');
const overlay = document.getElementById('overlay');
const poemText = document.getElementById('poem-text');
const touchHint = document.getElementById('touch-hint');
const progressDots = document.querySelectorAll('.dot');

const INTERACTION_EVENT = window.PointerEvent
    ? 'pointerup'
    : (('ontouchend' in window) ? 'touchend' : 'click');

// Initialize
function init() {
    console.log('[A Gentle Pot] init...');

    // Show the first chapter
    setTimeout(() => {
        showChapter(0);
    }, 500);

    // Bind interaction
    document.body.addEventListener(INTERACTION_EVENT, onInteraction, { passive: false });
}

function onInteraction(e) {
    e.preventDefault();

    // Only allow restart when ending prompt is shown
    if (isEnding) {
        if (canRestart) restart();
        return;
    }

    handleInteraction();
}

// Show chapter
function showChapter(chapterIndex) {
    if (chapterIndex >= chapters.length) {
        showEnding();
        return;
    }

    isTransitioning = true;
    const chapter = chapters[chapterIndex];
    currentChapterIndex = chapterIndex;
    currentPoemIndex = 0;

    console.log(`[A Gentle Pot] chapter: ${chapter.id}`);

    // Update progress
    updateProgress(chapterIndex);

    // Fade out content
    poemText.classList.remove('visible');
    touchHint.classList.remove('visible');

    setTimeout(() => {
        // Switch background
        bgImage.src = chapter.image;
        bgImage.classList.add('visible');

        // Switch overlay
        overlay.className = '';
        overlay.classList.add(chapter.overlayClass);

        // Show first line
        setTimeout(() => {
            showPoem(chapter.poems[0]);
            isTransitioning = false;
        }, 1500);
    }, 1000);
}

// Show poem line
function showPoem(text) {
    poemText.textContent = text;
    poemText.classList.add('visible');

    // Show tap hint
    setTimeout(() => {
        touchHint.classList.add('visible');
    }, 1000);
}

// Handle interaction
function handleInteraction() {
    if (isTransitioning || isEnding) return;

    const chapter = chapters[currentChapterIndex];

    // Hide tap hint
    touchHint.classList.remove('visible');

    // More lines in current chapter
    if (currentPoemIndex < chapter.poems.length - 1) {
        isTransitioning = true;
        currentPoemIndex++;

        // Fade out current line
        poemText.classList.remove('visible');

        // Show next line
        setTimeout(() => {
            showPoem(chapter.poems[currentPoemIndex]);
            isTransitioning = false;
        }, 800);
    }
    // Next chapter
    else {
        isTransitioning = true;
        poemText.classList.remove('visible');
        bgImage.classList.remove('visible');

        const nextChapterIndex = currentChapterIndex + 1;
        setTimeout(() => {
            showChapter(nextChapterIndex);
        }, 1500);
    }
}

// Update progress
function updateProgress(activeIndex) {
    progressDots.forEach((dot, index) => {
        if (index === activeIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

// Show ending
function showEnding() {
    console.log('[A Gentle Pot] experience complete');

    isEnding = true;
    canRestart = false;
    isTransitioning = true;
    isRestarting = false;

    overlay.style.background = 'rgba(0, 0, 0, 0.8)';

    setTimeout(() => {
        poemText.textContent = 'Tenderness is a pot of rice simmered slowly';
        poemText.classList.add('visible');

        setTimeout(() => {
            poemText.classList.remove('visible');

            setTimeout(() => {
                poemText.innerHTML = '— The End —<br><br><span style="font-size: 0.6em; opacity: 0.7;">Tap to experience again</span>';
                poemText.classList.add('visible');

                canRestart = true;
                isTransitioning = false;
            }, 1000);
        }, 4000);
    }, 1000);
}

// Restart
function restart() {
    if (isRestarting) return;
    isRestarting = true;
    canRestart = false;
    isEnding = false;
    isTransitioning = true;

    poemText.classList.remove('visible');
    overlay.style.background = '';

    setTimeout(() => {
        currentChapterIndex = 0;
        currentPoemIndex = 0;
        isRestarting = false;
        showChapter(0);
    }, 1000);
}

// Initialize after load
window.addEventListener('DOMContentLoaded', init);

// Prevent pull-to-refresh on mobile
document.body.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });
