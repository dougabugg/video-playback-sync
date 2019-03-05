console.log("[cs] video sync content script: started");
/*
how do we handle events from the media element, since we do not know if a given
event is from the user controlling the video or from the script syncing the
video playback.

a first solution is everytime we sync the video playback, we ignore the events that
will be fired as a result.

a second solution is to maintain a global state of the video. if an event is 
fired that agrees with the global state, then the event is not broadcasted.
if the event disagrees with the global state, then we assume the event is input
from the user and broadcast it.

a third solution is to poll the state of the video player at a set frequency.
anytime the state changes, broadcast it.

I'm not so sure about the third solution, it seems resource intensive and prone
to lag. the first and second solutions might be able to merge somehow and work
that way. we will see. whatever solution we choose, we should implement rate
limiting of broadcast messages to prevent feedback loops while testing.
*/
let videos;
let tvideo;

function log(msg) {
    console.log("[cs]", msg);
}

function capture_video(videoid) {
    tvideo = videos[videoid];
    // ["play", "playing", "pause", "waiting", "seeking", "seeked"
    // ].forEach(e => tvideo.addEventListener(e, on_any));
    ["play"].forEach(e =>
        tvideo.addEventListener(e, on_play));
    ["pause"].forEach(e =>
        tvideo.addEventListener(e, on_pause));
    tvideo.addEventListener("waiting", on_waiting);
    tvideo.addEventListener("playing", on_playing);
    tvideo.addEventListener("seeking", on_seeking);
    //
}

function playback_sync(msg) {
    if(msg.action == "play") {
        sync_play(msg.time);
    } else if(msg.action == "pause") {
        sync_pause(msg.time);
    }
}

function sync_play(time) {
    sync_seek(time);
    if(!tvideo.paused)
        return;
    on_play.block = true;
    tvideo.play();
}

function sync_pause(time) {
    sync_seek(time);
    if(tvideo.paused)
        return;
    on_pause.block = true;
    tvideo.pause();
}

function sync_seek(time) {
    if(time == null)
        return;
    if(Math.abs(time - tvideo.currentTime) < 0.01)
        return;
    on_seeking.block = true;
    tvideo.currentTime = time;
}

window.sync_play = sync_play;
window.sync_pause = sync_pause;
window.sync_seek = sync_seek;

function on_any(e) {
    log(`video event: ${e.type}; ${tvideo.currentTime}`);
}

function on_play(e) {
    if(on_play.block) {
        on_play.block = false;
        return;
    }
    broadcast_video_event({
        action: "play",
        time: tvideo.currentTime
    });
}
on_play.block = false;

function on_pause(e) {
    if(on_pause.block) {
        on_pause.block = false;
        return;
    }
    broadcast_video_event({
        action: "pause",
        time: tvideo.currentTime
    });
}
on_pause.block = false;

function on_waiting(e) {
    broadcast_video_event({
        action: "pause (waiting)",
        time: tvideo.currentTime
    });
    on_playing.disable = false;
}

function on_playing(e) {
    if(on_playing.disable)
        return;
    on_playing.disable = true;
    broadcast_video_event({
        action: "play (playing)",
        time: tvideo.currentTime
    });
}
on_playing.disable = true;

function on_seeking(e) {
    if(on_seeking.block) {
        on_seeking.block = false;
        return;
    }
    let action = tvideo.paused ? "pause" : "play";
    broadcast_video_event({
        action: action,
        time: tvideo.currentTime
    })
}
on_seeking.block = false;

function send_msg(action, msg) {
    browser.runtime.sendMessage({
        from: "tab",
        action: action,
        msg: msg
    });
}

function register_self() {
    videos = Array.from(document.querySelectorAll("video"));
    send_msg("register", {
        videos: videos.map(e => e.src)
    });
}

register_self();

function unregister_self() {
    send_msg("unregister");
}

window.addEventListener("beforeunload", unregister_self);

function msg_global_handler(msg, sender) {
    console.log(`[cs] message recv:\n`, msg, sender);

    if(msg.from == "background") {
        if(msg.action == "join-room" || msg.action == "host-room") {
            capture_video(msg.msg.videoid);
            // if(msg.action == "join-room") {
            //     //
            // } else {
            //     //
            // }
            setup_connection(msg.msg.roomId);
        }
    }
}

browser.runtime.onMessage.addListener(msg_global_handler);

// let broadcast_counter = 0;
// let broadcast_timer_set = false;
// let BROADCAST_TIMER = 500;
// let BROADCAST_LIMIT = 10;

let broadcast_queue = null;

function broadcast_video_event(msg) {
    // if(broadcast_counter > BROADCAST_LIMIT) {
    //     console.log("[cs] BROADCAST: over limit, message not sent", msg);
    //     return;
    // }
    // broadcast_counter++;
    // if(!broadcast_timer_set) {
    //     broadcast_timer_set = true;
    //     setTimeout(() => {
    //         broadcast_counter = 0;
    //         broadcast_timer_set = false;
    //     }, BROADCAST_TIMER);
    // }

    if(broadcast_queue == null) {
        setTimeout(() => {
            console.log(`[cs] BROADCAST: `, broadcast_queue);
            broadcast_queue = null;
        }, 5);
    }
    broadcast_queue = msg;

    // broadcast to websocket here
}

// window.addEventListener("message", event => {
//     if(event.source == window && event.data && event.data.action == "playback-sync") {
//         playback_sync(event.data.msg);
//     }
// })

let conn;

function setup_connection(roomid) {
    console.log("[cs] WS connecting...");
    conn = new WebSocket("ws://localhost:8080/");
    console.log("[cs] WS", conn);
    conn.addEventListener("message", e => {
        console.log(JSON.parse(e.data));
    });
    conn.addEventListener("error", e => {
        console.log("[bg] ", e);
    })
    conn.addEventListener("open", () => {
        conn.send(JSON.stringify("testing from [cs]"));
    });
}