console.log("video sync background script: started");

// function browser_action(tab) {
//     console.log(`browser action button clicked on tab\n${tab.id}\n(${tab.active}) ${tab.title}`);
//     browser.tabs.executeScript({
//         file: "content-script.js",
//         allFrames: true
//     });
//     // browser.browserAction.openPopup();
// }
// 
// browser.browserAction.onClicked.addListener(browser_action);

let tabs = {};
let TAB_UNINIT = -1;
let TAB_NO_VIDEO = 0;
let TAB_CHOOSE_VIDEO = 1;
let TAB_IDLE = 2;
let TAB_ACTIVE = 3;

function browser_action_handler(tabid) {
    if(tabid in tabs) {
        // init the popup here
    } else {
        init_new_tab(tabid);
    }
    send_msg_popup("update", {
        state: tabs[tabid].state
    });
}

function update_tab_state(tabid, state) {
    tabs[tabid].state = state;
    send_msg_popup("update", {
        state: state
    });
}

function init_new_tab(tabid) {
    console.log(`loaded tab ${tabid}`);
    tabs[tabid] = {
        frames: {},
        selected_video: null,
        state: TAB_UNINIT
    };
    browser.tabs.executeScript(tabid, {
        file: "content-script.js",
        allFrames: true
    });
}

function register_tab(tabid, frameid, msg) {
    let tab = tabs[tabid];
    let frame = tab.frames[frameid] = {};
    frame.videos = msg.videos;

    let videos = [];
    for(f in tab.frames) {
        tab.frames[f].videos.forEach((v, i) => {
            videos.push([f, i, v]);
        });
    }

    let total = videos.length;

    if(total == 0) {
        update_tab_state(tabid, TAB_NO_VIDEO);
    } else if(total == 1) {
        select_video(tabid, videos[0][0], videos[0][1]);
    } else {
        select_video(tabid, videos[0][0], videos[0][1]);
        // choosing video is currently unimplemented.
        // tab.state = TAB_CHOOSE_VIDEO;
        // tab.selected_video = null;
        // send_msg_popup("update", {
            
        // })
    }
}

function select_video(tabid, frameid, videoid) {
    let tab = tabs[tabid];
    tab.selected_video = [frameid, videoid];
    update_tab_state(tabid, TAB_IDLE);
}

function init_popup(tabid) {
    let tab = tabs[tabid];
}

function unregister_frame(tabid, frameid) {
    let tab = tabs[tabid];
    delete tab.frames[frameid];
    let i = 0;
    for(f in tab.frames) {
        i++;
    }
    if(i == 0) {
        console.log(`unloaded tab ${tabid}`);
        delete tabs[tabid];
    }
}

// message handling

function msg_global_handler(msg, sender) {
    console.log(`[bg] message recv:\n`, msg, sender);

    if(msg.from == "tab")
        msg_tab(msg, sender);
    else if(msg.from == "popup")
        msg_popup(msg, sender);
}

browser.runtime.onMessage.addListener(msg_global_handler);

function msg_tab(msg, sender) {
    if(msg.action == "register") {
        register_tab(sender.tab.id, sender.frameId, msg.msg);
    } else if(msg.action == "unregister") {
        unregister_frame(sender.tab.id, sender.frameId);
    }
}

function msg_popup(msg, sender) {
    browser.tabs.query({ active: true, currentWindow: true }).then(t => {
        // there should only be one tab returned
        let tabid = t[0].id;
        if(msg.action == "start") {
            browser_action_handler(tabid);
        } else if(msg.action == "host-room") {
            let [frameid, videoid] = tabs[tabid].selected_video;
            send_msg_frame(tabid, frameid, "host-room", {
                videoid
            });
            // update_tab_state(tabid, TAB_ACTIVE);
        } else if(msg.action == "join-room") {
            let [frameid, videoid] = tabs[tabid].selected_video;
            send_msg_frame(tabid, frameid, "join-room", {
                videoid,
                roomId: msg.msg.roomId
            });
            // update_tab_state(tabid, TAB_ACTIVE);
        }
    });
    
}

function send_msg_popup(action, msg) {
    browser.runtime.sendMessage({
        from: "background",
        action: action,
        msg: msg
    });
}

function send_msg_frame(tabid, frameid, action, msg) {
    browser.tabs.sendMessage(tabid, {
        from: "background",
        action,
        msg,
    }, {
        frameId: Number(frameid)
    });
}

function test() {
    console.log("[bg] WS start");
    let conn = new WebSocket("ws://localhost:8080/");
    console.log("[bg] WS", conn);
    conn.addEventListener("message", e => {
        console.log(e.data);
    });
    conn.addEventListener("error", e => {
        console.log("[bg] ", e);
    })
    conn.addEventListener("open", () => {
        console.log("sending test msg");
        conn.send(JSON.stringify("testing from [bg]"));
    });
}
// test();