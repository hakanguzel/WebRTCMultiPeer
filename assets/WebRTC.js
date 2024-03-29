var localVideo;
var firstPerson = false;
var socketCount = 0;
var socketId;
var localStream;
var connections = [];
var config = {
    host: window.location.origin
	//host: 'http://localhost:3000/'
}

function pageReady() {

    localVideo = document.getElementById('localVideo');
    remoteVideo = document.getElementById('remoteVideo');

    var constraints = {
        video: true,
        audio: true
    };

    if (navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia(constraints)
            .then(getUserMediaSuccess)
            .then(function () {

                socket = io.connect(config.host, { secure: true });
                socket.on('signal', gotMessageFromServer);

                socket.on('connect', function () {

                    socketId = socket.id;

                    socket.on('user-left', function (id) {
                        var video = document.querySelector('[data-socket="' + id + '"]');
                        var parentDiv = video.parentElement;
                        video.parentElement.parentElement.removeChild(parentDiv);
                    });


                    socket.on('user-joined', function (id, count, clients) {
                        clients.forEach(function (socketListId) {
                            if (!connections[socketListId]) {
                                connections[socketListId] = new RTCPeerConnection();
                                //Wait for their ice candidate
                                connections[socketListId].onicecandidate = function () {
                                    if (event.candidate != null) {
                                        console.log('İstek Gönderme');
                                        socket.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }));
                                    }
                                }

                                //Video akışını bekleyin
                                connections[socketListId].onaddstream = function () {
                                    gotRemoteStream(event, socketListId)
                                }

                                //Yerel video akışını ekleyin
                                connections[socketListId].addStream(localStream);
                            }
                        });

                        //Yerel açıklamanızla bağlantı kurmak için bir teklif oluşturun

                        if (count >= 2) {
                            connections[id].createOffer().then(function (description) {
                                connections[id].setLocalDescription(description).then(function () {
                                    // console.log(connections);
                                    socket.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }));
                                }).catch(e => console.log(e));
                            });
                        }
                    });
                })

            });
    } else {
        alert('Tarayıcınız getUserMedia API sini desteklemiyor');
    }
}

function getUserMediaSuccess(stream) {
    localStream = stream;
    localVideo.srcObject = stream;
}

function gotRemoteStream(event, id) {

    var videos = document.querySelectorAll('video'),
        video = document.createElement('video'),
        div = document.createElement('div')

    video.setAttribute('data-socket', id);
    video.srcObject = event.stream;
    video.autoplay = true;
    video.muted = false;
    video.playsinline = true;

    div.appendChild(video);
    document.querySelector('.videos').appendChild(div);
}

function gotMessageFromServer(fromId, message) {

    //Parse the incoming signal
    var signal = JSON.parse(message)

    //Make sure it's not coming from yourself
    if (fromId != socketId) {

        if (signal.sdp) {
            connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function () {
                if (signal.sdp.type == 'offer') {
                    connections[fromId].createAnswer().then(function (description) {
                        connections[fromId].setLocalDescription(description).then(function () {
                            socket.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }));
                        }).catch(e => console.log(e));
                    }).catch(e => console.log(e));
                }
            }).catch(e => console.log(e));
        }

        if (signal.ice) {
            connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e));
        }
    }
}