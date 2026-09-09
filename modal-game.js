//ссылка на папку в облаке
const URL_TO_ASSETS = 'https://storage.yandexcloud.net/gamefarmland/assets';
//откуда начинаем игру
const RESTART_ID = 'swamp-1';
//
const START_ID = 'start';

// ========================================================== переменные для работы  =======================================================

const isMobile = window.innerWidth <= 768;
//флаг
let isTransitioning = false;
//задержка
const delay = 800;
const delayAchiv = 1500;
const delayAchivNext = 100;
//массив ачивок
const achivementsArr = {
  tehn: 0,
  social: 0,
  survival: 0,
  secret: 0
};

// ========================================================== массивы данных для работы с сюжетом =======================================================

const SLIDES_CONFIG = [
  //   id: 'swamp-1',
  {
    id: 'start',
    text: 'Лисенок Танти отправляется на поиски редкого чуда. Впереди сложный путь — каждый твой выбор влияет на исход истории',
    textCenter: true,
    image: `${URL_TO_ASSETS}/img/swamp-2.webp`,
    imageMob: `${URL_TO_ASSETS}/img/swamp-2--mob.webp`,
    video: null,
    videoMob: null,
    buttons: [
      {
        text: 'В путь!',
        nextId: RESTART_ID,
        modifierClass: 'btn--green'
      }
    ],
    isDisclaimer: true,
    achiev: null
  },
  //   id: 'swamp-1',
  {
    id: RESTART_ID,
    text: 'Вечером с крыльца Танти замечает за горами зеленое мерцание',
    textCenter: false,
    image: `${URL_TO_ASSETS}/img/swamp-1.webp`,
    imageMob: `${URL_TO_ASSETS}/img/swamp-1--mob.webp`,
    video: null,
    videoMob: null,
    buttons: [
      {
        text: '',
        nextId: 'swamp-2',
        modifierClass: 'btn--inset'
      }
    ],
    achiev: null
  },
  //  id: 'swamp-2',
  {
    id: 'swamp-2',
    text: 'Это редкое чудо бывает пару раз в году, и видно его лишь из скрытой долины',
    textCenter: false,
    image: `${URL_TO_ASSETS}/img/swamp-2.webp`,
    imageMob: `${URL_TO_ASSETS}/img/swamp-2--mob.webp`,
    video: null,
    videoMob: null,
    buttons: [
      {
        text: '',
        nextId: 'swamp-3',
        modifierClass: 'btn--inset'
      }
    ],
    achiev: null
  },
  // id: 'swamp-3',
  {
    id: 'swamp-3',
    text: 'Вооружившись туристическим рюкзаком, Танти решает своими глазами увидеть это чудо и отправляется в путь',
    textCenter: false,
    image: `${URL_TO_ASSETS}/img/swamp-3.webp`,
    imageMob: `${URL_TO_ASSETS}/img/swamp-3--mob.webp`,
    video: null,
    videoMob: null,
    buttons: [
      {
        text: '',
        nextId: 'swamp-4',
        modifierClass: 'btn--inset'
      }
    ],
    achiev: null
  },
  //  id: 'swamp-4',
  {
    id: 'swamp-4',
    text: 'Добраться до долины нужно к вечеру!',
    textCenter: true,
    image: `${URL_TO_ASSETS}/img/swamp-3.webp`,
    imageMob: `${URL_TO_ASSETS}/img/swamp-4--mob.webp`,
    video: null,
    videoMob: null,
    buttons: [
      {
        text: 'Вперед!',
        nextId: 'swamp-choices',
        modifierClass: 'btn--green'
      }
    ],
    achiev: null
  },
  // id: 'swamp-choices',
  {
    id: 'swamp-choices',
    text: 'Впереди болото. Идти опасно. Что делать?',
    textCenter: true,
    image: `${URL_TO_ASSETS}/img/swamp-choices.webp`,
    imageMob: `${URL_TO_ASSETS}/img/swamp-choices--mob.webp`,
    video: null,
    isChoices: true,
    videoMob: null,
    isChoices: true,
    buttons: [
      {
        text: 'Осмотреть<br>растительность',
        nextId: 'swamp-choice-1-res',
        modifierClass: 'btn--img',
        btnImgDesc: `${URL_TO_ASSETS}/img/swamp-choices.webp`,
        btnImgMob: `${URL_TO_ASSETS}/img/swamp-choices--mob.webp`
      },
      {
        text: 'Поделиться угощением<br>с птицей',
        nextId: 'swamp-choice-2-res',
        modifierClass: 'btn--img',
        btnImgDesc: `${URL_TO_ASSETS}/img/swamp-choices.webp`,
        btnImgMob: `${URL_TO_ASSETS}/img/swamp-choices--mob.webp`
      },
      {
        text: 'Использовать треккинговую палку и навигацию',
        nextId: 'swamp-choice-3-res',
        modifierClass: 'btn--img',
        btnImgDesc: `${URL_TO_ASSETS}/img/swamp-choices.webp`,
        btnImgMob: `${URL_TO_ASSETS}/img/swamp-choices--mob.webp`
      }
    ],
    achiev: null
  },

  // id: 'swamp-choice-1-res',
  {
    id: 'swamp-choice-1-res',
    text: 'Танти кидает печенье вороне. Там, где спокойно садится крупная птица, — земля точно выдержит. Танти осторожно идет за ней.',
    textCenter: false,
    image: `${URL_TO_ASSETS}/img/swamp-choice-1-res.webp`,
    imageMob: `${URL_TO_ASSETS}/img/swamp-choice-1-res--mob.webp`,
    video: `${URL_TO_ASSETS}/img/swamp-choice-1-res.mp4`,
    videoMob: `${URL_TO_ASSETS}/img/swamp-choice-1-res--mob.mp4`,
    buttons: [
      {
        text: '',
        nextId: 'steppe-choices',
        modifierClass: 'btn--inset'
      }
    ],
    achiev: ['survival']
  },

  // id: 'swamp-choice-2-res',
  {
    id: 'swamp-choice-2-res',
    text: 'Танти замечает островки с осокой и сосной. Это верный признак твердой почвы. По ним он уверенно переходит топь.',
    textCenter: false,
    image: `${URL_TO_ASSETS}/img/swamp-choice-1-res.webp`,
    imageMob: `${URL_TO_ASSETS}/img/swamp-choice-1-res--mob.webp`,
    video: `${URL_TO_ASSETS}/img/swamp-choice-1-res.mp4`,
    videoMob: `${URL_TO_ASSETS}/img/swamp-choice-1-res--mob.mp4`,
    buttons: [
      {
        text: '',
        nextId: 'steppe-choices',
        modifierClass: 'btn--inset'
      }
    ],
    achiev: ['social', 'secret']
  },

  // id: 'swamp-choice-3-res',
  {
    id: 'swamp-choice-3-res',
    text: 'Через спутниковую карту, Танти намечает маршрут по отмелям и каждый свой шаг прощупывает трекинговой палкой',
    textCenter: false,
    image: `${URL_TO_ASSETS}/img/swamp-choice-1-res.webp`,
    imageMob: `${URL_TO_ASSETS}/img/swamp-choice-1-res--mob.webp`,
    video: `${URL_TO_ASSETS}/img/swamp-choice-1-res.mp4`,
    videoMob: `${URL_TO_ASSETS}/img/swamp-choice-1-res--mob.mp4`,
    buttons: [
      {
        text: '',
        nextId: 'steppe-choices',
        modifierClass: 'btn--inset'
      }
    ],
    achiev: ['tehn']
  },

  //=============================локация 2==============================================================
  //=============================локация 2==============================================================
  //=============================локация 2==============================================================

  // id: 'steppe-choices',
  {
    id: 'steppe-choices',
    text: 'Теперь — бескрайняя степь с высокой травой. Тропа совершенно затерялась нужно сориентироваться',
    textCenter: true,
    image: `${URL_TO_ASSETS}/img/swamp-2.webp`,
    imageMob: `${URL_TO_ASSETS}/img/swamp-2--mob.webp`,
    video: null,
    videoMob: null,
    isChoices: true,
    buttons: [
      {
        text: 'Сыграть на губной <br> гармошке',
        nextId: 'steppe-choice-3-res',
        modifierClass: 'btn--img',
        btnImgDesc: `${URL_TO_ASSETS}/img/swamp-choices.webp`,
        btnImgMob: `${URL_TO_ASSETS}/img/swamp-choices--mob.webp`
      },
      {
        text: 'Найти степной <br>  муравейник',
        nextId: 'steppe-choice-2-res',
        modifierClass: 'btn--img',
        btnImgDesc: `${URL_TO_ASSETS}/img/swamp-choices.webp`,
        btnImgMob: `${URL_TO_ASSETS}/img/swamp-choices--mob.webp`
      },
      {
        text: 'Использовать селфи-палку',
        nextId: 'steppe-choice-1-res',
        modifierClass: 'btn--img',
        btnImgDesc: `${URL_TO_ASSETS}/img/swamp-choices.webp`,
        btnImgMob: `${URL_TO_ASSETS}/img/swamp-choices--mob.webp`
      }
    ],
    achiev: null
  },

  // id: 'steppe-choice-1',
  // {
  //   id: 'steppe-choice-1',
  //   text: '',
  //   textCenter: true,
  //   image: `${URL_TO_ASSETS}/img/swamp-3.webp`,
  //   imageMob: `${URL_TO_ASSETS}/img/swamp-3--mob.webp`,
  //   video: null,
  //   videoMob: null,
  //   buttons: [
  //     {
  //       text: 'Назад',
  //       nextId: 'steppe-choices',
  //       modifierClass: 'btn--back'
  //     },
  //     {
  //       text: 'Использовать',
  //       nextId: 'steppe-choice-1-res',
  //       modifierClass: 'btn--green'
  //     }
  //   ],
  //   achiev: null
  // },
  // id: 'steppe-choice-1-res',
  {
    id: 'steppe-choice-1-res',
    text: 'Подняв смартфон над травой, Танти делает пару снимков. Селфи-палка отлично помогает увидеть примятую тропу. Маршрут найден!',
    textCenter: false,
    image: `${URL_TO_ASSETS}/img/swamp-choice-1-res.webp`,
    imageMob: `${URL_TO_ASSETS}/img/swamp-choice-1-res--mob.webp`,
    video: `${URL_TO_ASSETS}/img/swamp-choice-1-res.mp4`,
    videoMob: `${URL_TO_ASSETS}/img/swamp-choice-1-res--mob.mp4`,
    buttons: [
      {
        text: '',
        nextId: 'pass-choices',
        modifierClass: 'btn--inset'
      }
    ],
    achiev: ['tehn', 'secret']
  },

  // id: 'steppe-choice-2-res',
  {
    id: 'steppe-choice-2-res',
    text: 'Танти находит муравейник. Его южная сторона всегда более пологая. Определив стороны света, Танти выходит в нужном направлении.',
    textCenter: false,
    image: `${URL_TO_ASSETS}/img/swamp-choice-1-res.webp`,
    imageMob: `${URL_TO_ASSETS}/img/swamp-choice-1-res--mob.webp`,
    video: `${URL_TO_ASSETS}/img/swamp-choice-1-res.mp4`,
    videoMob: `${URL_TO_ASSETS}/img/swamp-choice-1-res--mob.mp4`,
    buttons: [
      {
        text: '',
        nextId: 'pass-choices',
        modifierClass: 'btn--inset'
      }
    ],
    achiev: ['survival']
  },

  // id: 'steppe-choice-3-res',
  {
    id: 'steppe-choice-3-res',
    text: 'Звонкая мелодия разносится по степи. На звук выходит пастушья собака и радостно выводит музыканта к натоптанной дороге.',
    textCenter: false,
    image: `${URL_TO_ASSETS}/img/swamp-choice-1-res.webp`,
    imageMob: `${URL_TO_ASSETS}/img/swamp-choice-1-res--mob.webp`,
    video: `${URL_TO_ASSETS}/img/swamp-choice-1-res.mp4`,
    videoMob: `${URL_TO_ASSETS}/img/swamp-choice-1-res--mob.mp4`,
    buttons: [
      {
        text: '',
        nextId: 'pass-choices',
        modifierClass: 'btn--inset'
      }
    ],
    achiev: ['social']
  },
  //=============================локация 3 ==============================================================
  //=============================локация 3 ==============================================================
  //=============================локация 3 ==============================================================

  // id: 'pass-choices',
  {
    id: 'pass-choices',
    text: 'Цель уже близко, но солнце клонится к закату. Впереди крутой участок с опасной осыпью',
    textCenter: true,
    image: `${URL_TO_ASSETS}/img/swamp-2.webp`,
    imageMob: `${URL_TO_ASSETS}/img/swamp-2--mob.webp`,
    video: null,
    isChoices: true,
    videoMob: null,
    buttons: [
      {
        text: 'Довериться местным <br/> обитателям',
        nextId: 'pass-choice-1-res',
        modifierClass: 'btn--img',
        btnImgDesc: `${URL_TO_ASSETS}/img/swamp-choices.webp`,
        btnImgMob: `${URL_TO_ASSETS}/img/swamp-choices--mob.webp`
      },
      {
        text: 'Использовать оптику <br/> смартфона',
        nextId: 'pass-choice-2-res',
        modifierClass: 'btn--img',
        btnImgDesc: `${URL_TO_ASSETS}/img/swamp-choices.webp`,
        btnImgMob: `${URL_TO_ASSETS}/img/swamp-choices--mob.webp`
      },
      {
        text: 'Внимательно изучить камни',
        nextId: 'pass-choice-3-res',
        modifierClass: 'btn--img',
        btnImgDesc: `${URL_TO_ASSETS}/img/swamp-choices.webp`,
        btnImgMob: `${URL_TO_ASSETS}/img/swamp-choices--mob.webp`
      }
    ],
    achiev: null
  },

  // id: 'pass-choice-1-res',
  {
    id: 'pass-choice-1-res',
    text: 'Танти замечает горного козлика. Животные инстинктивно знают прочные камни. Танти безопасно спускается, ступая след в след.',
    textCenter: false,
    image: `${URL_TO_ASSETS}/img/swamp-choice-1-res.webp`,
    imageMob: `${URL_TO_ASSETS}/img/swamp-choice-1-res--mob.webp`,
    video: `${URL_TO_ASSETS}/img/swamp-choice-1-res.mp4`,
    videoMob: `${URL_TO_ASSETS}/img/swamp-choice-1-res--mob.mp4`,
    buttons: [
      {
        text: '',
        nextId: 'calc',
        modifierClass: 'btn--inset'
      }
    ],
    achiev: ['social']
  },

  // id: 'pass-choice-2-res',
  {
    id: 'pass-choice-2-res',
    text: 'Через камеру смартфона Танти внимательно изучает склон, находит безопасную полосу монолитной породы и спускается по ней.',
    textCenter: false,
    image: `${URL_TO_ASSETS}/img/swamp-choice-1-res.webp`,
    imageMob: `${URL_TO_ASSETS}/img/swamp-choice-1-res--mob.webp`,
    video: `${URL_TO_ASSETS}/img/swamp-choice-1-res.mp4`,
    videoMob: `${URL_TO_ASSETS}/img/swamp-choice-1-res--mob.mp4`,
    buttons: [
      {
        text: '',
        nextId: 'calc',
        modifierClass: 'btn--inset'
      }
    ],
    achiev: ['tehn']
  },

  // id: 'pass-choice-3-res',
  {
    id: 'pass-choice-3-res',
    text: 'На неподвижных валунах всегда успевает вырасти лишайник. Танти ступает только по замшелым камням, избегая свежей осыпи.',
    textCenter: false,
    image: `${URL_TO_ASSETS}/img/swamp-choice-1-res.webp`,
    imageMob: `${URL_TO_ASSETS}/img/swamp-choice-1-res--mob.webp`,
    video: `${URL_TO_ASSETS}/img/swamp-choice-1-res.mp4`,
    videoMob: `${URL_TO_ASSETS}/img/swamp-choice-1-res--mob.mp4`,
    buttons: [
      {
        text: '',
        nextId: 'calc',
        modifierClass: 'btn--inset'
      }
    ],
    achiev: ['survival', 'secret']
  },

  //============================= подсчет  ==============================================================
  //============================= подсчет ==============================================================
  //============================= подсчет ==============================================================
  // id: 'calc',
  {
    id: 'calc',
    text: 'Позади остались болота, степи и крутые горы. Танти добрался до заветной долины! Твои решения в пути определили, как пройдет этот финал!',
    textCenter: true,
    image: `${URL_TO_ASSETS}/img/calc.webp`,
    imageMob: `${URL_TO_ASSETS}/img/calc--mob.webp`,
    video: null,
    videoMob: null,
    buttons: [
      {
        text: 'Смотреть финал',
        nextId: '',
        modifierClass: 'btn--green'
      }
    ],
    achiev: null
  },
  //=============================конец 1  ==============================================================
  //=============================конец 1 ==============================================================
  //=============================конец 1 ==============================================================

  // id: 'end1-1',
  {
    id: 'end1-1',
    text: 'Светлячки слишком высоко — Танти включает фонарь и направляет луч на поляну. Приняв свет за сородича, светлячки спускаются к лисёнку, образуя мерцающий купол.',
    textCenter: true,
    image: `${URL_TO_ASSETS}/img/swamp-1.webp`,
    imageMob: `${URL_TO_ASSETS}/img/swamp-1--mob.webp`,
    video: null,
    videoMob: null,
    buttons: [
      {
        text: '',
        nextId: 'restart',
        modifierClass: 'btn--inset'
      }
    ],
    achiev: null
  },

  //=============================конец 2  ==============================================================
  //=============================конец 2 ==============================================================
  //=============================конец 2 ==============================================================

  // id: 'end2-1',
  {
    id: 'end2-1',
    text: 'Танти выходит на поляну не один — за ним увязались его новые друзья. Светлячки совершенно не боятся их, принимая Танти за «своего», и кружатся прямо вокруг уютной компании.',
    textCenter: true,
    image: `${URL_TO_ASSETS}/img/swamp-2.webp`,
    imageMob: `${URL_TO_ASSETS}/img/swamp-2--mob.webp`,
    video: null,
    videoMob: null,
    buttons: [
      {
        text: '',
        nextId: 'restart',
        modifierClass: 'btn--inset'
      }
    ],
    achiev: null
  },
  //=============================конец 3  ==============================================================
  //=============================конец 3 ==============================================================
  //=============================конец 3 ==============================================================

  // id: 'end3-1',
  {
    id: 'end3-1',
    text: 'У кромки леса Танти находит скрытую тропу на секретный холм. Оттуда открывается лучший, недоступный обычным туристам вид на бескрайнее море светящихся огней.',
    textCenter: true,
    image: `${URL_TO_ASSETS}/img/swamp-3.webp`,
    imageMob: `${URL_TO_ASSETS}/img/swamp-3--mob.webp`,
    video: null,
    videoMob: null,
    buttons: [
      {
        text: '',
        nextId: 'restart',
        modifierClass: 'btn--inset'
      }
    ],
    achiev: null
  },
  //=============================конец 4  ==============================================================
  //=============================конец 4 ==============================================================
  //=============================конец 4 ==============================================================

  // id: 'end4-1',
  {
    id: 'end4-1',
    text: 'Танти наслаждается мерцанием и находит свой идеальный баланс: пьет чай из собранных трав, угощает бурундука печеньем и делает красивое селфи на фоне светлячков. Абсолютная гармония!',
    textCenter: true,
    image: `${URL_TO_ASSETS}/img/swamp-1.webp`,
    imageMob: `${URL_TO_ASSETS}/img/swamp-1--mob.webp`,
    video: null,
    videoMob: null,
    buttons: [
      {
        text: '',
        nextId: 'restart',
        modifierClass: 'btn--inset'
      }
    ],
    achiev: null
  },
  //=============================конец 5  ==============================================================
  //=============================конец 5 ==============================================================
  //=============================конец 5 ==============================================================

  // id: 'end5-1',
  {
    id: 'end5-1',
    text: 'Танти хочет сделать фото. Вдруг ворона садится прямо на край селфи-палки, и светлячки начинают мигать в едином ритме с крыльями. Крупный светлячок доверчиво садится Танти на нос. ',
    textCenter: true,
    image: `${URL_TO_ASSETS}/img/swamp-2.webp`,
    imageMob: `${URL_TO_ASSETS}/img/swamp-2--mob.webp`,
    video: null,
    videoMob: null,
    buttons: [
      {
        text: '',
        nextId: 'restart',
        modifierClass: 'btn--inset'
      }
    ],
    achiev: null
  },
  //============================= рестарт  ==============================================================
  //============================= рестарт ==============================================================
  //============================= рестарт ==============================================================

  // id: 'restart',
  {
    id: 'restart',
    text: 'Сыграй еще раз другим стилем, чтобы открыть остальные концовки ',
    textCenter: true,
    image: `${URL_TO_ASSETS}/img/swamp-3.webp`,
    imageMob: `${URL_TO_ASSETS}/img/swamp-3--mob.webp`,
    video: null,
    videoMob: null,
    buttons: [
      {
        text: 'Начать игру',
        nextId: RESTART_ID,
        modifierClass: 'btn--green'
      }
    ],
    achiev: null,
    isDisclaimer: true
  }
];

const ACHIEVEMENTS_CONFIG = {
  tehn: { title: 'технологиям', icon: `${URL_TO_ASSETS}/img/tehn.webp` },
  social: { title: 'общению', icon: `${URL_TO_ASSETS}/img/social.webp` },
  survival: { title: 'выживанию', icon: `${URL_TO_ASSETS}/img/survival.webp` }
};

const ENDINGS_CONFIG = {
  'end1-1': {
    title: 'Изобретатель',
    nextId: 'end1-1'
  },
  'end2-1': {
    title: 'Душа леса',
    nextId: 'end2-1'
  },
  'end3-1': {
    title: 'Истинный следопыт',
    nextId: 'end3-1'
  },
  'end4-1': {
    title: 'Гармоничный искатель',
    nextId: 'end4-1'
  },
  'end5-1': {
    title: 'Мастер скрытых троп',
    nextId: 'end5-1'
  }
};

const BACKPACK_CONFIG = {
  icon: `${URL_TO_ASSETS}/img/backpack.webp`,
  backbackground: `${URL_TO_ASSETS}/img/backpackBg.webp`,
  disclaimerDesk: `${URL_TO_ASSETS}/img/disclaimerDesk.svg`,
  disclaimerMob: `${URL_TO_ASSETS}/img/disclaimerMob.svg`,
  add: 'Реклама',
  picture: `${URL_TO_ASSETS}/img/backpackMain.webp`,
  title: 'Ваш рюкзак',
  desc: ' Здесь находятся предметы, которые могут помочь Танти в своем путешествии',
  btnText: 'Продолжить путешествие'
};

// ========================================================== начальное состояние игры ====================================================================

const gameState = {
  currentSlideId: START_ID,
  achievements: { ...achivementsArr }
};

// ================================================================== логика игры =========================================================================

function initGameEngine() {
  const slidesBox = document.querySelector('.modal-game__slides-box');
  if (!slidesBox) return;

  slidesBox.addEventListener('click', setupEvents);
  renderAllSlides();
  showBackpackBlock();

  // ================================================================== рендер всех слайдов ================================================================
  // ================================================================== рендер всех слайдов ================================================================
  // ================================================================== рендер всех слайдов ================================================================
  function renderAllSlides() {
    slidesBox.innerHTML = SLIDES_CONFIG.map((slide) => {
      const isActive = slide.id === gameState.currentSlideId ? 'slide--active' : '';
      const isFirstSlide = slide.id === START_ID;
      const decodingMode = isFirstSlide ? 'sync' : 'async';
      const isChoices = slide.isChoices;
      const isDisclaimer = slide.isDisclaimer;

      const buttonsHtml = slide.buttons
        ? slide.buttons
            .map(
              (btn, index) => `
              <button class="slide__btn ${btn.modifierClass || ''}" data-index="${index}">
               <span> ${btn.text}</span>                
               ${
                 slide.isChoices
                   ? `<picture>
                        <source srcset="${btn.btnImgMob}" media="(max-width: 768px)" />
                        <img src="${btn.btnImgDesc || ''}" alt="" decoding=${decodingMode} fetchpriority="high"/>
                      </picture>`
                   : ''
               } 
              </button>
            `
            )
            .join('')
        : '';

      const centerClass = slide.textCenter ? 'slide__text--center' : '';

      const svgHtml = slide.textCenter
        ? ''
        : `<div class="slide__arr">
          <svg width="64" height="71" viewBox="0 0 64 71" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M37.4879 35.4796L10.0785 69.6621L0 61.5806L20.9284 35.4796L0 9.37865L10.0785 1.29712L37.4879 35.4796ZM63.0446 35.4796L35.6352 69.6621L25.5567 61.5806L46.485 35.4796L25.5567 9.37865L35.6352 1.29712L63.0446 35.4796Z" fill="url(#paint0_linear_5001_27637)" stroke="white" stroke-opacity="0.5" stroke-width="1.84556"/>
            <defs>
              <linearGradient id="paint0_linear_5001_27637" x1="42.6808" y1="5.33788" x2="42.6808" y2="92.5015" gradientUnits="userSpaceOnUse">
                <stop stop-color="#459F07" />
                <stop offset="1" stop-color="#193903" />
              </linearGradient>
            </defs>
          </svg>
        </div>`;

      // const isVideo = slide.video || slide.videoMob;
      const video = isMobile ? slide.videoMob : slide.video;

      // ИСПРАВЛЕНО: preload="metadata" вместо preload="none"
      const bg = video
        ? `<video width="100%" height="100%" preload="metadata" loop muted playsinline poster="${slide.image || ''}">
          <source src="${video}" type='video/mp4; codecs="avc1.42E01E, mp4a.40.2"' />
         </video>`
        : `<picture>
          ${slide.imageMob ? `<source srcset="${slide.imageMob}" media="(max-width: 768px)" />` : ''}
          <img src="${slide.image || ''}" alt="" decoding=${decodingMode} fetchpriority="high"/>
        </picture>`;

      return `
      <div class="slide ${isActive}  " data-id="${slide.id}">
        <div class="slide__content ${isDisclaimer ? 'slide__content--isDisclaimer' : ''}">
          <div class="slide__text-box">
            <p class="slide__text ${isChoices ? 'slide__text--isChoices' : ''} ${centerClass}">${slide.text || ''}</p>
            ${svgHtml}
          </div>
          <div class="slide__btn-box ${isChoices ? 'slide__btn-box--isChoices' : ''}">
            ${buttonsHtml}
          </div>
        </div>

        ${
          isDisclaimer
            ? `
           <div class="slide__disclaimer-box">
        <p class="slide__disclaimer-add">${BACKPACK_CONFIG.add}</p>
    
          <picture class="slide__disclaimer">
            <source srcset="${BACKPACK_CONFIG.disclaimerMob}" media="(max-width: 768px)" />
            <img src="${BACKPACK_CONFIG.disclaimerDesk}" alt="" fetchpriority="high" />
          </picture>
       
      </div>`
            : ''
        }
        
        <div class="slide__bg">
          ${bg}
        </div>
      </div>
    `;
    }).join('');

    // Запускаем видео на стартовом слайде, если оно там есть
    const activeSlide = slidesBox.querySelector('.slide--active');
    handleSlideVideo(activeSlide, true);
  }

  // ===================================================================== рассчет концовки ================================================================
  // ===================================================================== рассчет концовки ================================================================
  // ===================================================================== рассчет концовки ================================================================

  function calculateEnding(achievs) {
    if (achievs.secret >= 3) {
      return ENDINGS_CONFIG['end5-1'];
    }
    if (achievs.survival >= 2) {
      return ENDINGS_CONFIG['end3-1'];
    }
    if (achievs.social >= 2) {
      return ENDINGS_CONFIG['end2-1'];
    }
    if (achievs.tehn >= 2) {
      return ENDINGS_CONFIG['end1-1'];
    }
    return ENDINGS_CONFIG['end4-1'];
  }

  // ============================================================= рендер всего, что не касается слайдов =====================================================
  // ============================================================= рендер всего, что не касается слайдов =====================================================
  // ============================================================= рендер всего, что не касается слайдов =====================================================

  function showAchievementOverlay(achievArray, nextId) {
    const modalContent = document.querySelector('.modal-game__container');
    if (!modalContent || !Array.isArray(achievArray) || achievArray.length === 0) return;

    const mainAchievKey = achievArray[0];

    const info = ACHIEVEMENTS_CONFIG[mainAchievKey];

    const overlay = document.createElement('div');
    overlay.className = 'achiev-overlay';
    overlay.innerHTML = `
        <div class="achiev-overlay__card">
          <div class="achiev-overlay__body">
            <span>+1 к</span>
            <div class="achiev-overlay__img">
                    <img src="${info.icon}" alt="${info.title}"  />
            </div>
            <span>${info.title}</span>
          </div>
        </div>
      `;

    modalContent.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.classList.add('achiev-overlay--show');
    });

    setTimeout(() => {
      overlay.classList.remove('achiev-overlay--show');
      setTimeout(() => overlay.remove(), delay);
      setTimeout(() => changeSlideWithAnimation(nextId), delayAchivNext);
    }, delayAchiv);
  }

  function showEndingOverlay(endingData, achievements) {
    const modalContent = document.querySelector('.modal-game__container');
    if (!modalContent || !endingData) return;

    const overlay = document.createElement('div');
    overlay.className = 'ending-overlay';

    const activeAchievements = Object.entries(achievements).filter(([key, count]) => key !== 'secret' && count > 0);

    const counterBlocks =
      activeAchievements.length > 0
        ? activeAchievements
            .map(([key, count]) => {
              const info = ACHIEVEMENTS_CONFIG[key] || { title: key, icon: '' };
              return `
                <div class="ending-overlay__badge" title="${info.title}">
                  <span class="ending-overlay__count">${count}</span>
                  <div class="ending-overlay__badge-img">
                  <img src="${info.icon}" alt="${info.title}" />
                  </div>
                </div>
              `;
            })
            .join('')
        : '';

    overlay.innerHTML = `
    <div class="ending-overlay__card">
      <div class="ending-overlay__bg">
        <img src="${URL_TO_ASSETS}/img/endAchBg.webp" alt="" />
      </div>

          <div class="ending-overlay__content">
      <div class="ending-overlay__achive">
        <div class="ending-overlay__img">
          <img src="${URL_TO_ASSETS}/img/endAchImg.webp" alt="${endingData.title}" />
        </div>

        <div class="ending-overlay__body">
          <div class="ending-overlay__body-inner">
            <div class="ending-overlay__head">
              <p class="ending-overlay__subtitle">Твой стиль путешествия:</p>
              <p class="ending-overlay__title">${endingData.title}!</p>
            </div>
            <div class="ending-overlay__result">
              <p class="ending-overlay__result-title">Твои решения:</p>
              <div class="ending-overlay__counter">${counterBlocks}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="ending-overlay__btn-box">
        <div class="ending-overlay__end">
          <div class="ending-overlay__end-img">
            <img src="${URL_TO_ASSETS}/img/prize.webp" alt="${endingData.title}" />
          </div>
          <p class="ending-overlay__end-text">Открыта новая концовка!</p>
        </div>

        <div class="slide__btn btn--green">Отлично!</div>
      </div>
    </div>
    </div>
      `;

    modalContent.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.classList.add('ending-overlay--show');
    });

    overlay.addEventListener('click', (e) => {
      // Проверяем, был ли клик по кнопке .slide__btn или её дочерним элементам
      const btn = e.target.closest('.slide__btn');
      if (!btn) return; // Если кликнули мимо кнопки — ничего не делаем

      e.stopPropagation();
      isTransitioning = false;
      overlay.classList.remove('ending-overlay--show');

      setTimeout(() => {
        changeSlideWithAnimation(endingData.nextId);
        overlay.remove();
      }, 300);
    });
  }

  function showBackpackBlock() {
    const modalContainer = document.querySelector('.modal-game__container');
    if (!modalContainer) return;

    backpackBadge = document.createElement('button');
    backpackBadge.className = 'backpack-badge';
    modalContainer.appendChild(backpackBadge);

    backpackBadge.innerHTML = `
      <div class="backpack-badge__img">
        <img src="${BACKPACK_CONFIG.icon}" alt="рюкзак" />
      </div>
    `;

    backpackModal = document.createElement('div');
    backpackModal.className = 'backpack-modal';
    modalContainer.appendChild(backpackModal);

    backpackModal.innerHTML = `
      <div class="backpack-modal__inner">
      <div class="backpack-modal__bg">
        <img decoding= async' src="${BACKPACK_CONFIG.backbackground}" alt="" />
      </div>

      <div class="backpack-modal__body">
        <div class="backpack-modal__content">
          <div class="backpack-modal__img">
            <img decoding= async' src="${BACKPACK_CONFIG.picture}" alt="" />
          </div>
          <div class="backpack-modal__info">
            <div class="backpack-modal__info-body">
              <p class="backpack-modal__title">${BACKPACK_CONFIG.title}</p>
              <p class="backpack-modal__desc">${BACKPACK_CONFIG.desc}</p>
            </div>
          </div>
        </div>
        <button class="backpack-modal__btn btn--green">${BACKPACK_CONFIG.btnText}</button>
      </div>

      <div class="backpack-modal__disclaimer-box">
        <p class="backpack-modal__disclaimer-add">${BACKPACK_CONFIG.add}</p>
    
          <picture class="backpack-modal__disclaimer">
            <source srcset="${BACKPACK_CONFIG.disclaimerMob}" media="(max-width: 768px)" />
            <img src="${BACKPACK_CONFIG.disclaimerDesk}" alt="" fetchpriority="high" />
          </picture>
       
      </div>
    </div>
    `;

    // Функции управления модалкой
    function openModal() {
      backpackModal.classList.add('isOpen');
    }

    function closeModal() {
      backpackModal.classList.remove('isOpen');
    }

    // Вешаем слушатели событий через addEventListener
    backpackBadge.addEventListener('click', openModal);

    const closeBtn = backpackModal.querySelector('.backpack-modal__btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }
  }

  function showCounterBlock() {
    const modalContainer = document.querySelector('.modal-game__container');
    if (!modalContainer) return;

    let counterBlock = modalContainer.querySelector('.achiev-counter ');
    if (!counterBlock) {
      counterBlock = document.createElement('div');
      counterBlock.className = 'achiev-counter ';
      modalContainer.appendChild(counterBlock);
    }

    const activeAchievements = Object.entries(gameState.achievements).filter(([key, count]) => key !== 'secret' && count > 0);

    if (activeAchievements.length === 0) {
      counterBlock.innerHTML = '';
      return;
    }

    counterBlock.innerHTML = activeAchievements
      .map(([key, count]) => {
        const info = ACHIEVEMENTS_CONFIG[key] || { title: key, icon: '' };
        return `
            <div class="achiev-counter__badge" title="${info.title}">
              <span class="achiev-counter__count">${count}</span>
              <div class="achiev-counter__img">
                <img src="${info.icon}" alt="${info.title}"  />
              </div>
            </div>
          `;
      })
      .join('');
  }

  // ================================================================вспомогательные функции:================================================================
  // ================================================================вспомогательные функции:================================================================
  // ================================================================вспомогательные функции:================================================================

  // Получение текущего слайда по айдишнику
  function getSlideById(id) {
    return SLIDES_CONFIG.find((slide) => slide.id === id);
  }

  // запуск/остановка видео
  function handleSlideVideo(slideEl, shouldPlay) {
    if (!slideEl) return;
    const video = slideEl.querySelector('video');
    if (!video) return;

    if (shouldPlay) {
      video.currentTime = 0;
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }

  // обработка выбора
  function handleChoice(btnData, currentSlide) {
    if (btnData.nextId === RESTART_ID) {
      resetGameState();
      return;
    }

    if (currentSlide.achiev) {
      showAchievementOverlay(currentSlide.achiev, btnData.nextId);
      unlockAchievement(currentSlide.achiev);
      // setTimeout(() => {
      //   changeSlideWithAnimation(btnData.nextId);
      // }, delay);
      return;
    }

    if (btnData.nextId) {
      changeSlideWithAnimation(btnData.nextId);
    }
  }

  // Клик по кнопкам/слайдам для перехода
  function setupEvents(e) {
    if (isTransitioning) return;

    const btn = e.target.closest('.slide__btn');
    if (!btn) return;

    const currentSlide = getSlideById(gameState.currentSlideId);
    if (!currentSlide) return;

    const btnIndex = btn.dataset.index;
    const btnData = currentSlide.buttons[btnIndex];
    if (!btnData) return;

    if (currentSlide.id === 'calc') {
      const endingData = calculateEnding(gameState.achievements);
      showEndingOverlay(endingData, gameState.achievements);
      return;
    }

    handleChoice(btnData, currentSlide);
  }

  // анимация смены слайда
  function changeSlideWithAnimation(nextId) {
    if (isTransitioning) return;

    const currentSlideEl = slidesBox.querySelector('.slide--active');
    const nextSlideEl = slidesBox.querySelector(`[data-id="${nextId}"]`);

    if (!nextSlideEl || currentSlideEl === nextSlideEl) return;

    isTransitioning = true;

    nextSlideEl.classList.add('slide--active');
    gameState.currentSlideId = nextId;

    // Запускаем видео на НОВОМ слайде
    handleSlideVideo(nextSlideEl, true);

    setTimeout(() => {
      if (currentSlideEl) {
        currentSlideEl.classList.remove('slide--active');
        currentSlideEl.style.zIndex = ''; // сбрасываем z-index
        // Останавливаем видео на СТАРОМ слайде
        handleSlideVideo(currentSlideEl, false);
      }
      nextSlideEl.style.zIndex = ''; // сбрасываем z-index
      isTransitioning = false;
    }, 300);
  }

  // начало игры заново
  function resetGameState() {
    gameState.achievements = { ...achivementsArr };
    gameState.currentSlideId = RESTART_ID;

    showCounterBlock();

    const modalContent = document.querySelector('.modal-game__modal');
    if (modalContent) {
      const overlays = modalContent.querySelectorAll('.modal-game__achievement-overlay, .modal-game__ending-overlay');
      overlays.forEach((el) => el.remove());
    }

    const allSlides = slidesBox.querySelectorAll('.slide');
    allSlides.forEach((slide) => {
      if (slide.dataset.id === RESTART_ID) {
        slide.classList.add('slide--active');
        handleSlideVideo(slide, true);
      } else {
        slide.classList.remove('slide--active');
        handleSlideVideo(slide, false);
      }
    });

    isTransitioning = false;
  }

  //обновление каунтера

  function unlockAchievement(achiev) {
    if (!Array.isArray(achiev)) return;

    achiev.forEach((key) => {
      if (gameState.achievements[key] !== undefined) {
        gameState.achievements[key] += 1;
      }
    });

    setTimeout(() => {
      showCounterBlock();
    }, delayAchiv);
  }
}
// =============================================================== предпрогрузка картинок ================================================================

// function preloadOverlayAssets() {
//   const overlayUrls = new Set([
//     ...Object.values(ACHIEVEMENTS_CONFIG).map((item) => item.icon),
//     `${URL_TO_ASSETS}/img/endAchBg.webp`,
//     `${URL_TO_ASSETS}/img/endAchImg.webp`,
//     `${URL_TO_ASSETS}/img/prize.webp`,
//     // Картинки из BACKPACK_CONFIG
//     BACKPACK_CONFIG.icon,
//     BACKPACK_CONFIG.backbackground,
//     BACKPACK_CONFIG.picture,
//     BACKPACK_CONFIG.disclaimerDesk,
//     BACKPACK_CONFIG.disclaimerMob
//   ]);

//   overlayUrls.forEach((url) => {
//     if (!url) return;
//     const img = new Image();
//     img.src = url;
//   });
// }

function preloadOverlayAssets() {
  const overlayUrls = new Set([
    ...Object.values(ACHIEVEMENTS_CONFIG).map((item) => item.icon),
    `${URL_TO_ASSETS}/img/endAchBg.webp`,
    `${URL_TO_ASSETS}/img/endAchImg.webp`,
    `${URL_TO_ASSETS}/img/prize.webp`,
    BACKPACK_CONFIG.icon,
    BACKPACK_CONFIG.backbackground,
    BACKPACK_CONFIG.picture,
    BACKPACK_CONFIG.disclaimerDesk,
    BACKPACK_CONFIG.disclaimerMob
  ]);

  // Создаем скрытый контейнер один раз
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.width = '0px';
  container.style.height = '0px';
  container.style.overflow = 'hidden';
  container.style.opacity = '0';
  container.style.pointerEvents = 'none';

  overlayUrls.forEach((url) => {
    if (!url) return;
    // Создаем реальный тег img и добавляем в DOM
    const img = document.createElement('img');
    img.src = url;
    container.appendChild(img);
  });

  // Вшиваем контейнер в документ — теперь браузер гарантированно
  // и скачает, и сразу пропустит их через движок рендеринга.
  document.body.appendChild(container);
}

// ============================================================ рендер модалки и кнопки ===================================================================
// ============================================================ рендер модалки и кнопки ===================================================================

function initModalShell() {
  let modalOverlay, modalContent, videoButton, closeButton;
  const config = {
    trigger: {
      bgImage: 'https://storage.yandexcloud.net/external-assets/tantum/modal-game/circle.png',
      previewVideo: 'https://storage.yandexcloud.net/external-assets/tantum/modal-game/hello.mp4'
    }
  };
  function createTrigger(conf) {
    const btn = document.createElement('button');
    btn.className = 'trigger';
    const inner = document.createElement('div');
    inner.className = 'trigger__inner';
    const img = document.createElement('img');
    img.src = conf.trigger.bgImage;
    img.className = 'trigger__bg';
    const video = document.createElement('video');
    video.className = 'trigger__video';
    video.muted = video.loop = video.autoplay = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    const source = document.createElement('source');
    source.src = conf.trigger.previewVideo;
    source.type = 'video/mp4';
    video.appendChild(source);
    inner.append(img, video);
    btn.appendChild(inner);
    return btn;
  }

  function createModal(conf) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-game__overlay';
    const modal = document.createElement('div');
    modal.className = 'modal-game__modal';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-game__close';
    closeBtn.innerHTML = `<svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M20.0466 0.835449L0.835328 20.0467M0.835327 0.835449L20.0466 20.0467" stroke="white" stroke-width="1.67054" stroke-linecap="round" />
</svg>`;
    const container = document.createElement('div');
    container.className = 'modal-game__container';
    const slidesBox = document.createElement('div');
    slidesBox.className = 'modal-game__slides-box';

    container.append(slidesBox);
    modal.append(closeBtn, container);
    overlay.appendChild(modal);
    return overlay;
  }

  function renderGame() {
    videoButton = createTrigger(config);
    modalOverlay = createModal(config);
    document.body.append(videoButton, modalOverlay);
    modalContent = modalOverlay.querySelector('.modal-game__modal');
    closeButton = modalOverlay.querySelector('.modal-game__close');
  }

  function setupEventListeners() {
    videoButton.addEventListener('click', openModal);
    closeButton.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        closeModal();
      }
    });
  }

  const getScrollbarWidth = () => window.innerWidth - document.documentElement.clientWidth;

  function openModal() {
    modalOverlay.style.display = 'flex';
    let scrollWith = getScrollbarWidth();
    setTimeout(() => {
      modalOverlay.style.opacity = '1';
      modalContent.style.transform = 'translateY(0)';
    }, 10);
    document.body.style.paddingRight = `${scrollWith}px`;
    videoButton.style.marginRight = `${scrollWith}px`;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modalOverlay.style.opacity = '0';
    modalContent.style.transform = 'translateY(30px)';
    setTimeout(() => {
      modalOverlay.style.display = 'none';
      document.body.style.paddingRight = '0px';
      videoButton.style.marginRight = '0px';
      document.body.style.overflow = '';
    }, 300);
  }

  renderGame();
  setupEventListeners();
}

// ============================================================ добавление тега стилей ===================================================================
// ============================================================ добавление тега стилей ===================================================================

function addResponsiveStyles() {
  const style = document.createElement('style');
  style.textContent = `@charset "UTF-8";.modal-game__container .backpack-badge::after,.modal-game__container .btn--img::before{content:"";aspect-ratio:1/1;background-image:url("data:image/svg+xml,%3Csvg  viewBox='0 0 36 36' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='36' height='36' rx='18' fill='white'/%3E%3Cpath d='M15 24L19.9409 19.0591C20.4402 18.5598 20.6898 18.3102 20.6898 18C20.6898 17.6898 20.4402 17.4402 19.9409 16.9409L15 12' stroke='%23163F26' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:center}@font-face{font-family:Gilroy;src:url("${URL_TO_ASSETS}/fonts/Gilroy-Bold.woff2") format("woff2");font-weight:700;font-style:normal;font-display:swap}@font-face{font-family:Gilroy;src:url("${URL_TO_ASSETS}/fonts/Gilroy-Medium.woff2") format("woff2");font-weight:500;font-style:normal;font-display:swap}:root{--wiepotrDeviseWith:1920}.trigger{position:fixed;bottom:calc(110 * 100vw / var(--wiepotrDeviseWith));right:calc(100 * 100vw / var(--wiepotrDeviseWith));width:calc(180 * 100vw / var(--wiepotrDeviseWith));aspect-ratio:1;background:0 0;border:none;cursor:pointer;border-radius:50%;z-index:1039;padding:0}.trigger__inner{width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;border-radius:50%}.trigger__bg{width:100%;height:100%;-o-object-fit:contain;object-fit:contain;position:absolute;z-index:1}.trigger__video{width:80%;height:70%;-o-object-fit:contain;object-fit:contain;z-index:2;border-radius:50%}.modal-game__overlay{position:fixed;inset:0;background:rgba(0,0,0,.8);display:none;align-items:center;justify-content:center;z-index:110001;opacity:0;transition:opacity .3s;cursor:pointer}.modal-game__overlay *{padding:0;margin:0;box-sizing:border-box}.modal-game__overlay img{width:100%;height:100%;-o-object-fit:cover;object-fit:cover}.modal-game__modal{cursor:default;border-radius:calc(12 * 100vw / var(--wiepotrDeviseWith));overflow:hidden;position:relative;transform:translateY(calc(30 * 100vw / var(--wiepotrDeviseWith)));transition:transform .3s;width:calc(1367 * 100vw / var(--wiepotrDeviseWith));aspect-ratio:16/9;background:#555754!important;font-family:Gilroy,Montserrat,"Century Gothic",Futura,sans-serif;font-weight:700;color:#fff}.modal-game__container{width:100%;height:100%;position:relative}.modal-game__close{position:absolute;flex-shrink:0;top:calc(57 * 100vw / var(--wiepotrDeviseWith));right:calc(57 * 100vw / var(--wiepotrDeviseWith));aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);color:#fff;border:none;border-radius:50%;cursor:pointer;z-index:1110;width:calc(50 * 100vw / var(--wiepotrDeviseWith));font-size:calc(24 * 100vw / var(--wiepotrDeviseWith))}.modal-game__close svg{width:calc(21 * 100vw / var(--wiepotrDeviseWith));aspect-ratio:1}.modal-game__slides-box{display:grid;width:100%;height:100%;position:relative}.modal-game__container img{content-visibility:auto}.modal-game__container button{background:0 0;outline:unset;border:unset;color:inherit;font-family:inherit;cursor:pointer}.modal-game__container .slide__btn{outline:0;border:none;text-align:center;width:-moz-fit-content;width:fit-content;font-size:calc(34 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .btn--inset{position:absolute;inset:0;opacity:0;width:100%}.modal-game__container .btn--green{backdrop-filter:blur(calc(5 * 100vw / var(--wiepotrDeviseWith)));-webkit-backdrop-filter:blur(calc(5 * 100vw / var(--wiepotrDeviseWith)));padding:calc(17 * 100vw / var(--wiepotrDeviseWith)) calc(38 * 100vw / var(--wiepotrDeviseWith));border-radius:calc(60 * 100vw / var(--wiepotrDeviseWith));background:linear-gradient(180deg,#459f07 0,#193903 144.59%);white-space:nowrap;flex-shrink:0}@media (max-width:48em){:root{--wiepotrDeviseWith:375}.trigger{bottom:calc(20 * 100vw / var(--wiepotrDeviseWith));width:calc(100 * 100vw / var(--wiepotrDeviseWith));right:calc(16 * 100vw / var(--wiepotrDeviseWith))}.modal-game__modal{width:calc(350 * 100vw / var(--wiepotrDeviseWith));aspect-ratio:3/4}.modal-game__close svg{width:calc(13 * 100vw / var(--wiepotrDeviseWith))}.modal-game__close{top:calc(12 * 100vw / var(--wiepotrDeviseWith));right:calc(12 * 100vw / var(--wiepotrDeviseWith));font-size:calc(14 * 100vw / var(--wiepotrDeviseWith));width:calc(30 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .slide__btn{width:100%;font-size:calc(12 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .btn--green{padding:calc(7 * 100vw / var(--wiepotrDeviseWith)) calc(14 * 100vw / var(--wiepotrDeviseWith))}}.modal-game__container .btn--back{padding:calc(15 * 100vw / var(--wiepotrDeviseWith)) calc(36 * 100vw / var(--wiepotrDeviseWith));border-radius:calc(60 * 100vw / var(--wiepotrDeviseWith));border:calc(2 * 100vw / var(--wiepotrDeviseWith)) solid rgba(255,255,255,.5);background:0 0}@media (max-width:48em){.modal-game__container .btn--back{padding:calc(5 * 100vw / var(--wiepotrDeviseWith)) calc(12 * 100vw / var(--wiepotrDeviseWith))}}.modal-game__container .btn--img{position:relative;width:100%;aspect-ratio:407/240;background:0 0;border:calc(2 * 100vw / var(--wiepotrDeviseWith)) solid var(--white-50);border-radius:calc(24 * 100vw / var(--wiepotrDeviseWith));overflow:hidden;padding:calc(20 * 100vw / var(--wiepotrDeviseWith));display:flex;flex-direction:column;gap:calc(20 * 100vw / var(--wiepotrDeviseWith));align-items:center;justify-content:flex-end;font-size:calc(24 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .btn--img::before{width:calc(36 * 100vw / var(--wiepotrDeviseWith));flex-shrink:0;z-index:2}.modal-game__container .btn--img span{position:relative;z-index:1}@media (max-width:48em){.modal-game__container .btn--img::before{width:calc(28 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .btn--img{aspect-ratio:318/70;padding:calc(16 * 100vw / var(--wiepotrDeviseWith)) calc(12 * 100vw / var(--wiepotrDeviseWith));font-size:calc(12 * 100vw / var(--wiepotrDeviseWith));align-items:center;justify-content:space-between;flex-direction:row-reverse;border-radius:calc(12 * 100vw / var(--wiepotrDeviseWith));text-align:left}.modal-game__container .btn--img span{width:calc(123 * 100vw / var(--wiepotrDeviseWith));display:block}}.modal-game__container .btn--img picture{position:absolute;inset:0;width:100%;height:100%}.modal-game__container .slide{backface-visibility:hidden;transform:translateZ(0);will-change:opacity;overflow:hidden;grid-column:1/-1;grid-row:1/-1;position:absolute;inset:0;width:100%;height:100%;box-sizing:border-box;display:flex;justify-content:flex-end;gap:calc(20 * 100vw / var(--wiepotrDeviseWith));flex-direction:column;opacity:0;pointer-events:none;transition:opacity .8s;padding:calc(50 * 100vw / var(--wiepotrDeviseWith)) calc(85 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .slide--active{opacity:1;pointer-events:auto}.modal-game__container .slide__bg{position:absolute;inset:0}.modal-game__container .slide__bg img,.modal-game__container .slide__bg picture,.modal-game__container .slide__bg video{backface-visibility:hidden;transform:translateZ(0);width:100%;height:100%;display:block;-o-object-fit:cover;object-fit:cover}.modal-game__container .slide__content{display:flex;flex-direction:column;width:100%;z-index:2;gap:calc(20 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .slide__content--isDisclaimer{flex-direction:row;align-items:center}.modal-game__container .slide__text-box{display:flex;gap:calc(20 * 100vw / var(--wiepotrDeviseWith));justify-content:space-between;align-items:flex-start}.modal-game__container .slide__text{margin:0;flex-grow:1;font-size:calc(45 * 100vw / var(--wiepotrDeviseWith));line-height:normal}.modal-game__container .slide__text--isChoices{text-align:center}.modal-game__container .slide__arr{aspect-ratio:63/98;flex-shrink:0;width:calc(50 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .slide__arr svg{width:100%;height:100%;-o-object-fit:cover;object-fit:cover}.modal-game__container .slide__btn-box{display:flex;flex-wrap:wrap;gap:calc(14 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .slide__btn-box:has(.btn--back){display:grid;grid-template-columns:repeat(2,1fr)}.modal-game__container .slide__btn-box:has(.btn--back) .slide__btn{width:100%}.modal-game__container .slide__btn-box:has(.btn--inset){position:absolute;inset:0}@media (max-width:48em){.modal-game__container .slide{padding:calc(30 * 100vw / var(--wiepotrDeviseWith)) calc(16 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .slide__content--isDisclaimer{flex-direction:column;gap:gap(8)}.modal-game__container .slide__content{gap:gap(10)}.modal-game__container .slide__text--center{text-align:center}.modal-game__container .slide__text{font-size:calc(14 * 100vw / var(--wiepotrDeviseWith));line-height:unset}.modal-game__container .slide__arr{width:calc(17 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .slide__btn-box:has(.btn--back){display:flex;flex-direction:column}.modal-game__container .slide__btn-box{width:100%;display:flex;flex-direction:column;gap:calc(10 * 100vw / var(--wiepotrDeviseWith))}}.modal-game__container .slide__btn-box--isChoices{display:grid;grid-template-columns:repeat(3,1fr);gap:calc(13 * 100vw / var(--wiepotrDeviseWith));border-radius:calc(26 * 100vw / var(--wiepotrDeviseWith));padding:calc(8 * 100vw / var(--wiepotrDeviseWith));box-shadow:calc(5 * 100vw / var(--wiepotrDeviseWith)) calc(4 * 100vw / var(--wiepotrDeviseWith)) calc(22 * 100vw / var(--wiepotrDeviseWith)) 0 rgba(0,0,0,.55);background:rgba(255,255,255,.5);position:absolute;top:calc(128 * 100vw / var(--wiepotrDeviseWith));left:50%;transform:translateX(-50%);width:calc(1236 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .slide__disclaimer-box{display:flex;align-items:center;flex-direction:column;margin-bottom:calc(8 * 100vw / var(--wiepotrDeviseWith));gap:calc(13 * 100vw / var(--wiepotrDeviseWith));position:relative;z-index:10}.modal-game__container .slide__disclaimer-add{font-size:calc(17 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .slide__disclaimer{width:calc(1310 * 100vw / var(--wiepotrDeviseWith));aspect-ratio:1507/95}.modal-game__container .achiev-counter{position:absolute;top:calc(40 * 100vw / var(--wiepotrDeviseWith));left:50%;transform:translateX(-50%);display:flex;gap:calc(16 * 100vw / var(--wiepotrDeviseWith));z-index:1100;pointer-events:none}.modal-game__container .achiev-counter__badge{display:flex;align-items:center;gap:calc(8 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .achiev-counter__img{width:calc(80 * 100vw / var(--wiepotrDeviseWith));aspect-ratio:1;-o-object-fit:contain;object-fit:contain}.modal-game__container .achiev-counter__count{color:#fff;font-size:calc(45 * 100vw / var(--wiepotrDeviseWith));font-weight:700}.modal-game__container .achiev-overlay,.modal-game__container .ending-overlay{position:absolute;inset:0;backdrop-filter:blur(calc(10 * 100vw / var(--wiepotrDeviseWith)));-webkit-backdrop-filter:blur(calc(10 * 100vw / var(--wiepotrDeviseWith)));background:rgba(10,22,2,.4);display:flex;align-items:center;justify-content:center;z-index:1200;opacity:0;transition:opacity .4s;pointer-events:auto}.modal-game__container .achiev-overlay--show{opacity:1}.modal-game__container .achiev-overlay--show .achiev-overlay__card{transform:scale(1)}.modal-game__container .achiev-overlay__card{display:flex;flex-direction:column;align-items:center;transform:scale(.4);transition:transform .4s}.modal-game__container .achiev-overlay__body{display:flex;align-items:center;gap:calc(8 * 100vw / var(--wiepotrDeviseWith));font-size:calc(45 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .achiev-overlay__img{aspect-ratio:1;width:calc(80 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .ending-overlay--show,.modal-game__container .ending-overlay--show .ending-overlay__card{opacity:1}.modal-game__container .ending-overlay--show .ending-overlay__content{scale:1}.modal-game__container .ending-overlay__card{display:flex;align-items:center;justify-content:center;align-items:center;transition:opacity .3s;width:100%;height:100%;position:relative}.modal-game__container .ending-overlay__bg{width:100%;height:100%;position:absolute;pointer-events:none;inset:0}.modal-game__container .ending-overlay__bg img{width:68%;height:107%;-webkit-mask-image:radial-gradient(circle at center,black 15%,rgba(0,0,0,0.1) 94%,transparent 96%);mask-image:radial-gradient(circle at center,black 15%,rgba(0,0,0,0.1) 94%,transparent 96%)}.modal-game__container .ending-overlay__content{display:flex;flex-direction:column;gap:calc(30 * 100vw / var(--wiepotrDeviseWith));transition:scale .3s;scale:0.4}.modal-game__container .ending-overlay__achive{margin-left:calc(134 * 100vw / var(--wiepotrDeviseWith));width:calc(646 * 100vw / var(--wiepotrDeviseWith));position:relative}.modal-game__container .ending-overlay__img{width:calc(357 * 100vw / var(--wiepotrDeviseWith));position:absolute;aspect-ratio:1;left:calc(-172 * 100vw / var(--wiepotrDeviseWith));bottom:0}.modal-game__container .ending-overlay__body{border-radius:calc(26 * 100vw / var(--wiepotrDeviseWith));background:rgba(255,255,255,.7);padding:calc(34 * 100vw / var(--wiepotrDeviseWith)) calc(34 * 100vw / var(--wiepotrDeviseWith)) calc(34 * 100vw / var(--wiepotrDeviseWith)) calc(186 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .ending-overlay__body-inner{border-radius:calc(23 * 100vw / var(--wiepotrDeviseWith));padding:calc(17 * 100vw / var(--wiepotrDeviseWith));background:#fff;color:#163f26;display:flex;flex-direction:column;gap:calc(4 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .ending-overlay__head{display:flex;flex-direction:column;gap:calc(1 * 100vw / var(--wiepotrDeviseWith));text-align:center;align-items:center}.modal-game__container .ending-overlay__subtitle{font-size:calc(15 * 100vw / var(--wiepotrDeviseWith));font-weight:500}.modal-game__container .ending-overlay__title{font-weight:700;font-size:calc(45 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .ending-overlay__result{display:flex;flex-direction:column;align-items:center;text-align:center;gap:calc(8 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .ending-overlay__result-title{font-size:calc(15 * 100vw / var(--wiepotrDeviseWith));font-weight:500}.modal-game__container .ending-overlay__counter{display:flex;align-items:center;justify-content:center;gap:calc(30 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .ending-overlay__badge{border-radius:calc(9 * 100vw / var(--wiepotrDeviseWith));padding:calc(8 * 100vw / var(--wiepotrDeviseWith)) calc(14 * 100vw / var(--wiepotrDeviseWith));gap:calc(2 * 100vw / var(--wiepotrDeviseWith));display:flex;align-items:center;justify-content:space-between;background:#eff6ef;display:flex;align-items:center}.modal-game__container .ending-overlay__badge-img{width:calc(60 * 100vw / var(--wiepotrDeviseWith));aspect-ratio:1}.modal-game__container .ending-overlay__count{font-weight:700;font-size:calc(34 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .ending-overlay__btn-box{display:flex;align-items:center;justify-content:space-between}.modal-game__container .ending-overlay__end{display:flex;align-items:center}.modal-game__container .ending-overlay__end-img{position:absolute;border-radius:calc(14 * 100vw / var(--wiepotrDeviseWith));width:calc(93 * 100vw / var(--wiepotrDeviseWith));height:calc(85 * 100vw / var(--wiepotrDeviseWith));left:0;overflow:hidden}.modal-game__container .ending-overlay__end-text{background:rgba(78,129,42,.6);color:#fff;font-weight:500;line-height:110%;border:calc(.18 * 100vw / var(--wiepotrDeviseWith)) solid #fff;border-radius:calc(17 * 100vw / var(--wiepotrDeviseWith));padding:calc(5 * 100vw / var(--wiepotrDeviseWith)) calc(10 * 100vw / var(--wiepotrDeviseWith)) calc(5 * 100vw / var(--wiepotrDeviseWith)) calc(110 * 100vw / var(--wiepotrDeviseWith));width:calc(294 * 100vw / var(--wiepotrDeviseWith));font-size:calc(22 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .ending-overlay .btn--green{padding:calc(17 * 100vw / var(--wiepotrDeviseWith)) calc(103 * 100vw / var(--wiepotrDeviseWith));white-space:nowrap;flex-shrink:0}.modal-game__container .backpack-badge{position:absolute;top:calc(40 * 100vw / var(--wiepotrDeviseWith));left:calc(57 * 100vw / var(--wiepotrDeviseWith));display:flex;align-items:center;gap:calc(10 * 100vw / var(--wiepotrDeviseWith));padding:calc(8 * 100vw / var(--wiepotrDeviseWith)) calc(12 * 100vw / var(--wiepotrDeviseWith));background:rgba(239,246,239,.5);border-radius:calc(50 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .backpack-badge::after{width:calc(36 * 100vw / var(--wiepotrDeviseWith));flex-shrink:0;z-index:2}.modal-game__container .backpack-badge__img{width:calc(52 * 100vw / var(--wiepotrDeviseWith));aspect-ratio:1;-o-object-fit:contain;object-fit:contain}.modal-game__container .backpack-modal{transform:translateZ(0);will-change:opacity;position:absolute;width:100%;height:100%;inset:0;z-index:10;opacity:0;pointer-events:none;visibility:hidden;transition:opacity .5s,visibility .5s,pointer-events .5s}.modal-game__container .backpack-modal.isOpen{opacity:1;visibility:visible;pointer-events:fill}.modal-game__container .backpack-modal.isOpen .backpack-modal__body{opacity:1;scale:0.86}.modal-game__container .backpack-modal__inner{width:100%;height:100%;position:relative;display:flex;align-items:center;justify-content:center}.modal-game__container .backpack-modal__bg{position:absolute;width:100%;height:100%;inset:0}.modal-game__container .backpack-modal__body{position:absolute;scale:0.7;opacity:0;transition:opacity .3s,scale .3s;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:calc(32 * 100vw / var(--wiepotrDeviseWith));transform:translateZ(0);will-change:transform}.modal-game__container .backpack-modal__content{display:flex;flex-direction:column;align-items:center;position:relative;margin-left:calc(215 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .backpack-modal__img{position:absolute;width:calc(778 * 100vw / var(--wiepotrDeviseWith));height:calc(440 * 100vw / var(--wiepotrDeviseWith));top:calc(-43 * 100vw / var(--wiepotrDeviseWith));z-index:2;left:calc(-458 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .backpack-modal__info{border-radius:calc(29 * 100vw / var(--wiepotrDeviseWith));width:calc(733 * 100vw / var(--wiepotrDeviseWith));--webkit-backdrop-filter:blur(pxToRemMix(4));backdrop-filter:blur(calc(4 * 100vw / var(--wiepotrDeviseWith)));background:rgba(255,255,255,.7);padding:calc(72 * 100vw / var(--wiepotrDeviseWith)) calc(48 * 100vw / var(--wiepotrDeviseWith)) calc(72 * 100vw / var(--wiepotrDeviseWith)) calc(238 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .backpack-modal__info-body{border-radius:calc(26 * 100vw / var(--wiepotrDeviseWith));padding:calc(48 * 100vw / var(--wiepotrDeviseWith)) calc(35 * 100vw / var(--wiepotrDeviseWith));background:#fff;display:flex;align-items:center;flex-direction:column;color:#163f26;gap:calc(10 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .backpack-modal__title{font-weight:700;font-size:calc(52 * 100vw / var(--wiepotrDeviseWith));text-align:center}.modal-game__container .backpack-modal__desc{font-weight:400;font-size:calc(17 * 100vw / var(--wiepotrDeviseWith));text-align:center;width:calc(260 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .backpack-modal__disclaimer-box{display:flex;align-items:center;flex-direction:column;position:relative;align-self:flex-end;margin-bottom:calc(8 * 100vw / var(--wiepotrDeviseWith));gap:calc(13 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .backpack-modal__disclaimer-add{font-size:calc(17 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .backpack-modal__disclaimer{width:calc(1310 * 100vw / var(--wiepotrDeviseWith));aspect-ratio:1507/95}@media (max-width:48em){.modal-game__container .slide__btn-box--isChoices{display:flex;flex-direction:column;gap:calc(4 * 100vw / var(--wiepotrDeviseWith));width:calc(100% - 24 * 100vw / var(--wiepotrDeviseWith));top:calc(60 * 100vw / var(--wiepotrDeviseWith));padding:calc(3 * 100vw / var(--wiepotrDeviseWith));border-radius:calc(12 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .backpack-modal__disclaimer-add,.modal-game__container .slide__disclaimer-add{font-size:calc(7 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .slide__disclaimer{width:calc(325 * 100vw / var(--wiepotrDeviseWith));aspect-ratio:325/50}.modal-game__container .achiev-counter{top:calc(12 * 100vw / var(--wiepotrDeviseWith));gap:calc(10 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .achiev-counter__img,.modal-game__container .achiev-overlay__img{width:calc(40 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .achiev-counter__count,.modal-game__container .achiev-overlay__body,.modal-game__container .ending-overlay__title{font-size:calc(14 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .ending-overlay__bg img{width:100%;height:100%;-webkit-mask-image:unset;mask-image:unset}.modal-game__container .ending-overlay__content{gap:calc(12 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .ending-overlay__achive{width:calc(164 * 100vw / var(--wiepotrDeviseWith));margin-left:unset;margin-top:calc(145 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .ending-overlay__img{width:calc(174 * 100vw / var(--wiepotrDeviseWith));left:50%;transform:translateX(-50%);top:calc(-145 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .ending-overlay__body{padding:calc(24 * 100vw / var(--wiepotrDeviseWith)) calc(6 * 100vw / var(--wiepotrDeviseWith)) calc(6 * 100vw / var(--wiepotrDeviseWith)) calc(6 * 100vw / var(--wiepotrDeviseWith));border-radius:calc(5 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .ending-overlay__body-inner{border-radius:calc(5 * 100vw / var(--wiepotrDeviseWith));padding:calc(12 * 100vw / var(--wiepotrDeviseWith)) calc(14 * 100vw / var(--wiepotrDeviseWith)) calc(10 * 100vw / var(--wiepotrDeviseWith));gap:calc(6 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .ending-overlay__subtitle{font-size:calc(9 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .ending-overlay__result{gap:calc(4 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .ending-overlay__result-title{font-size:calc(9 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .ending-overlay__counter{gap:calc(10 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .ending-overlay__badge{padding:calc(2 * 100vw / var(--wiepotrDeviseWith)) calc(4 * 100vw / var(--wiepotrDeviseWith));border-radius:calc(5 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .ending-overlay__badge-img{width:calc(20 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .ending-overlay__count{font-size:calc(10 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .ending-overlay__btn-box{flex-direction:column;gap:calc(12 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .ending-overlay__end{width:100%}.modal-game__container .ending-overlay__end-img{border-radius:calc(6 * 100vw / var(--wiepotrDeviseWith));width:calc(37 * 100vw / var(--wiepotrDeviseWith));height:calc(34 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .ending-overlay__end-text{border:calc(.25 * 100vw / var(--wiepotrDeviseWith)) solid #fff;border-radius:calc(6 * 100vw / var(--wiepotrDeviseWith));padding:calc(8 * 100vw / var(--wiepotrDeviseWith)) calc(15 * 100vw / var(--wiepotrDeviseWith)) calc(8 * 100vw / var(--wiepotrDeviseWith)) calc(50 * 100vw / var(--wiepotrDeviseWith));width:100%;font-size:calc(8 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .ending-overlay .btn--green{padding:calc(7 * 100vw / var(--wiepotrDeviseWith)) calc(50 * 100vw / var(--wiepotrDeviseWith));width:100%}.modal-game__container .backpack-badge{top:calc(12 * 100vw / var(--wiepotrDeviseWith));left:calc(12 * 100vw / var(--wiepotrDeviseWith));padding:calc(4 * 100vw / var(--wiepotrDeviseWith));gap:calc(4 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .backpack-badge::after,.modal-game__container .backpack-badge__img{width:calc(28 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .backpack-modal.isOpen .backpack-modal__body{scale:1}.modal-game__container .backpack-modal__body{gap:calc(8 * 100vw / var(--wiepotrDeviseWith));margin-top:calc(45 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .backpack-modal__content{margin-left:unset}.modal-game__container .backpack-modal__img{margin-left:unset;top:calc(-132 * 100vw / var(--wiepotrDeviseWith));left:50%;transform:translateX(-50%);width:calc(350 * 100vw / var(--wiepotrDeviseWith));height:calc(194 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .backpack-modal__info{background:rgba(255,255,255,.7);padding:calc(76 * 100vw / var(--wiepotrDeviseWith)) calc(12 * 100vw / var(--wiepotrDeviseWith)) calc(12 * 100vw / var(--wiepotrDeviseWith));border-radius:calc(5 * 100vw / var(--wiepotrDeviseWith));width:calc(216 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .backpack-modal__info-body{border-radius:calc(5 * 100vw / var(--wiepotrDeviseWith));padding:calc(12 * 100vw / var(--wiepotrDeviseWith)) calc(10 * 100vw / var(--wiepotrDeviseWith));gap:calc(5 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .backpack-modal__title{font-size:calc(18 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .backpack-modal__desc{width:100%;font-size:calc(12 * 100vw / var(--wiepotrDeviseWith))}.modal-game__container .backpack-modal__disclaimer{width:calc(325 * 100vw / var(--wiepotrDeviseWith));aspect-ratio:325/50}}`;
  document.head.appendChild(style);
}

// ========================================================== запуск скриптов ====================================================================

document.addEventListener('DOMContentLoaded', () => {
  preloadOverlayAssets();
  addResponsiveStyles();
  initModalShell();
  initGameEngine();
});
