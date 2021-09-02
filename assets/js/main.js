/*!
 *
 * WebRTC Lab
 * @author dodortus (dodortus@gmail.com / codejs.co.kr)
 *
 */
$(function () {
  console.log('Loaded Main');

  let roomId;
  let userId;
  let remoteUserId;
  let isOffer;

  const socket = io();
  const mediaHandler = new MediaHandler();
  const peerHandler = new PeerHandler({
    send: send,
  });
  const animationTime = 500;
  const isSafari = DetectRTC.browser.isSafari;
  const isMobile = DetectRTC.isMobileDevice;
  const mediaOption = {
    audio: true,
    video: {
      mandatory: {
        maxWidth: 1920,
        maxHeight: 1080,
        maxFrameRate: 30,
      },
      optional: [
        { googNoiseReduction: true }, // Muhtemelen hesaplama çabası pahasına yakalanan video akışındaki gürültüyü ortadan kaldırır.
        { facingMode: 'user' }, // Varsa ön / kullanıcıya bakan kamerayı veya arka / ortama bakan kamerayı seçin (Telefonda)
      ],
    },
  };

  // DOM
  const $body = $('body');
  const $createWrap = $('#create-wrap');
  const $waitWrap = $('#wait-wrap');
  const $videoWrap = $('#video-wrap');
  const $uniqueToken = $('#unique-token');

  /**
   * Girdikten sonra başka bir katılımcı bulunduğunda ara
   */
  function onDetectUser() {
    console.log('onDetectUser');

    $waitWrap.html(
      [
        '<div class="room-info">',
        '<p>Görüşmeye bekleniyorsunuz. Katılmak ister misiniz?</p>',
        '<button id="btn-join">Katıl</button>',
        '</div>',
      ].join('\n')
    );

    $('#btn-join').click(function () {
      isOffer = true;
      peerHandler.getUserMedia(mediaOption, onLocalStream, isOffer);
      $(this).attr('disabled', true);
    });

    $createWrap.slideUp(animationTime);
  }

  /**
   * 참석자 핸들링
   * @param roomId
   * @param userList
   */
  function onJoin(roomId, userList) {
    console.log('onJoin', userList);

    if (Object.size(userList) > 1) {
      onDetectUser();
    }
  }

  /**
   * 이탈자 핸들링
   * @param userId
   */
  function onLeave(userId) {
    console.log('onLeave', arguments);

    if (remoteUserId === userId) {
      $('#remote-video').remove();
      $body.removeClass('connected').addClass('wait');
      remoteUserId = null;
    }
  }

  /**
   * Soket mesajı işleme
   * @param data
   */
  function onMessage(data) {
    console.log('onMessage', arguments);

    if (!remoteUserId) {
      remoteUserId = data.sender;
    }

    if (data.sdp || data.candidate) {
      peerHandler.signaling(data);
    } else {
      // etc
    }
  }

  /**
   * Soket mesaj iletimi
   * @param data
   */
  function send(data) {
    console.log('send', arguments);

    data.roomId = roomId;
    data.sender = userId;
    socket.send(data);
  }

  /**
   * Odaya özel erişim jetonu oluşturun
   */
  function setRoomToken() {
    const hashValue = (Math.random() * new Date().getTime())
      .toString(32)
      .toUpperCase()
      .replace(/\./g, '-');

    if (location.hash.length > 2) {
      $uniqueToken.attr('href', location.href);
    } else {
      location.hash = '#' + hashValue;
    }
  }

  /**
   * Pano kopyası
   */
  function setClipboard() {
    $uniqueToken.click(function () {
      const link = location.href;

      if (window.clipboardData) {
        window.clipboardData.setData('text', link);
        alert('Panoya başarıyla kopyalandı.');
      } else {
        window.prompt('Panoya kopyala: Ctrl + C, Enter', link); // Panoya kopyala: Ctrl + C, Enter
      }
    });
  }

  /**
   * Yerel akış yönetimi
   * @param stream
   */
  function onLocalStream(stream) {
    $videoWrap.prepend('<video id="local-video" muted="muted" autoplay />');
    const localVideo = document.querySelector('#local-video');
    mediaHandler.setVideoStream({
      type: 'local',
      el: localVideo,
      stream: stream,
    });

    $body.addClass('room wait');

    if (isMobile && isSafari) {
      mediaHandler.playForIOS(localVideo);
    }
  }

  /**
   * Karşı taraf akışı işleme
   * @param stream
   */
  function onRemoteStream(stream) {
    console.log('onRemoteStream', stream);

    $videoWrap.prepend('<video id="remote-video" autoplay />');
    const remoteVideo = document.querySelector('#remote-video');
    mediaHandler.setVideoStream({
      type: 'remote',
      el: remoteVideo,
      stream: stream,
    });

    $body.removeClass('wait').addClass('connected');

    if (isMobile && isSafari) {
      mediaHandler.playForIOS(remoteVideo);
    }
  }

  /**
   * İlk ayar
   */
  function initialize() {
    roomId = location.href.replace(/\/|:|#|%|\.|\[|\]/g, '');
    userId = Math.round(Math.random() * 99999);
    setRoomToken();
    setClipboard();

    // Soketle ilgili olay bağlama
    socket.emit('enter', roomId, userId);
    socket.on('join', onJoin);
    socket.on('leave', onLeave);
    socket.on('message', onMessage);

    // Eşle ilgili olay bağlama
    peerHandler.on('addRemoteStream', onRemoteStream);

    $('#btn-start').click(function () {
      peerHandler.getUserMedia(mediaOption, onLocalStream);
    });

    $('#btn-camera').click(function () {
      const $this = $(this);
      $this.toggleClass('active');
      mediaHandler[$this.hasClass('active') ? 'pauseVideo' : 'resumeVideo']();
    });

    $('#btn-mic').click(function () {
      const $this = $(this);
      $this.toggleClass('active');
      mediaHandler[$this.hasClass('active') ? 'muteAudio' : 'unmuteAudio']();
    });
  }

  initialize();
});
