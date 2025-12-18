// 一锅温柔 - 互动诗歌核心逻辑

const chapters = [
    {
        id: 'spring',
        image: 'assets/images/Spring_Lake.png',
        overlayClass: 'overlay-spring',
        poems: [
            '水面清透',
            '如晶',
            '易碎'
        ]
    },
    {
        id: 'winter',
        image: 'assets/images/Winter_Quarry.png',
        overlayClass: 'overlay-winter',
        poems: [
            '有些东西',
            '冷得像石头',
            '难以融化'
        ]
    },
    {
        id: 'autumn',
        image: 'assets/images/Autumn_Temple.png',
        overlayClass: 'overlay-autumn',
        poems: [
            '归处',
            '是一盏温暖的灯',
            '一锅慢炖的米饭'
        ]
    }
];

let currentChapterIndex = 0;
let currentPoemIndex = 0;
let isTransitioning = false;
let isEnding = false;
let canRestart = false;
let isRestarting = false;

// DOM元素
const bgImage = document.getElementById('background-image');
const overlay = document.getElementById('overlay');
const poemText = document.getElementById('poem-text');
const touchHint = document.getElementById('touch-hint');
const progressDots = document.querySelectorAll('.dot');

const INTERACTION_EVENT = window.PointerEvent
    ? 'pointerup'
    : (('ontouchend' in window) ? 'touchend' : 'click');

// 初始化
function init() {
    console.log('[一锅温柔] 初始化...');

    // 显示第一个章节
    setTimeout(() => {
        showChapter(0);
    }, 500);

    // 绑定交互事件
    document.body.addEventListener(INTERACTION_EVENT, onInteraction, { passive: false });
}

function onInteraction(e) {
    e.preventDefault();

    // 结尾状态下只允许“重新体验”，并且要等提示出现后才响应
    if (isEnding) {
        if (canRestart) restart();
        return;
    }

    handleInteraction();
}

// 显示章节
function showChapter(chapterIndex) {
    if (chapterIndex >= chapters.length) {
        showEnding();
        return;
    }

    isTransitioning = true;
    const chapter = chapters[chapterIndex];
    currentChapterIndex = chapterIndex;
    currentPoemIndex = 0;

    console.log(`[一锅温柔] 播放章节: ${chapter.id}`);

    // 更新进度指示器
    updateProgress(chapterIndex);

    // 淡出当前内容
    poemText.classList.remove('visible');
    touchHint.classList.remove('visible');

    setTimeout(() => {
        // 切换背景图
        bgImage.src = chapter.image;
        bgImage.classList.add('visible');

        // 切换颜色滤镜
        overlay.className = '';
        overlay.classList.add(chapter.overlayClass);

        // 显示第一句诗
        setTimeout(() => {
            showPoem(chapter.poems[0]);
            isTransitioning = false;
        }, 1500);
    }, 1000);
}

// 显示诗句
function showPoem(text) {
    poemText.textContent = text;
    poemText.classList.add('visible');

    // 显示触摸提示
    setTimeout(() => {
        touchHint.classList.add('visible');
    }, 1000);
}

// 处理交互
function handleInteraction() {
    if (isTransitioning || isEnding) return;

    const chapter = chapters[currentChapterIndex];

    // 隐藏触摸提示
    touchHint.classList.remove('visible');

    // 当前章节还有诗句
    if (currentPoemIndex < chapter.poems.length - 1) {
        isTransitioning = true;
        currentPoemIndex++;

        // 淡出当前诗句
        poemText.classList.remove('visible');

        // 显示下一句
        setTimeout(() => {
            showPoem(chapter.poems[currentPoemIndex]);
            isTransitioning = false;
        }, 800);
    }
    // 当前章节结束，进入下一章
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

// 更新进度指示器
function updateProgress(activeIndex) {
    progressDots.forEach((dot, index) => {
        if (index === activeIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

// 显示结局
function showEnding() {
    console.log('[一锅温柔] 体验结束');

    isEnding = true;
    canRestart = false;
    isTransitioning = true;
    isRestarting = false;

    overlay.style.background = 'rgba(0, 0, 0, 0.8)';

    setTimeout(() => {
        poemText.textContent = '温柔，是一锅慢炖的米饭';
        poemText.classList.add('visible');

        setTimeout(() => {
            poemText.classList.remove('visible');

            setTimeout(() => {
                poemText.innerHTML = '— 完 —<br><br><span style="font-size: 0.6em; opacity: 0.7;">再次触摸屏幕重新体验</span>';
                poemText.classList.add('visible');

                canRestart = true;
                isTransitioning = false;
            }, 1000);
        }, 4000);
    }, 1000);
}

// 重新开始
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

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', init);

// 防止下拉刷新（移动端）
document.body.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });
