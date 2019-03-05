
let TAB_UNINIT = -1;
let TAB_NO_VIDEO = 0;
let TAB_CHOOSE_VIDEO = 1;
let TAB_IDLE = 2;
let TAB_ACTIVE = 3;

function switch_state(msg) {
    if(msg.state == TAB_NO_VIDEO) {
        state_no_video();
    } else if(msg.state == TAB_CHOOSE_VIDEO) {
        state_choose_video(msg);
    } else if(msg.state == TAB_IDLE) {
        // state_idle();
        state_join_room();
    } else if(msg.state == TAB_ACTIVE) {
        state_active_room();
    }
}

let main_div = document.querySelector(".main");

function state_error(err) {
    show_class("error");
    main_div.querySelector(".error").textContent = err;
}

function state_uninit() {
    show_class("uninit");
}

function state_no_video() {
    show_class("no-video");
}

function state_choose_video(msg) {
    // not implemented yet
    show_class("choose-video");
}

function state_idle() {
    show_class("idle");
}

let idle_div = main_div.querySelector(".subsection.idle");
let buttons = idle_div.querySelectorAll("button");
let host_btn = buttons[0];
let join_btn = buttons[1];
host_btn.addEventListener("click", ev => {
    send_msg("host-room");
    idle_div.querySelector(".loading").style.display = "block";
});
join_btn.addEventListener("click", ev => {
    state_join_room();
});

function state_join_room() {
    show_class("join-room");
}

let join_div = main_div.querySelector(".subsection.join-room");
let roomId = join_div.querySelector(".room-id");
buttons = join_div.querySelectorAll("button");
let submit_btn = buttons[0];
let cancel_btn = buttons[1];
submit_btn.addEventListener("click", ev => {
    send_msg("join-room", {
        roomId: roomId.value
    });
    join_div.querySelector(".loading").style.display = "block";
});
// cancel_btn.addEventListener("click", ev => {
//     state_idle();
// });

function state_active_room() {
    show_class("active-room");
}

let active_div = main_div.querySelector(".subsection.active-room");
let leave_btn = active_div.querySelector("button");
leave_btn.addEventListener("click", ev => {
    send_msg("leave-room");
    active_div.querySelector(".loading").style.display = "block";
})

// backend handlers and functions

function send_msg(action, msg) {
    browser.runtime.sendMessage({
        from: "popup",
        action: action,
        msg: msg
    })
}

function msg_global_handler(msg, sender) {
    if(msg.from == "background") {
        console.log(`[pu] message recv:\n`, msg, sender);
        if(msg.action == "update") {
            switch_state(msg.msg);
        } else if(msg.action == "error") {
            state_error(msg.msg);
        }
    }
}

browser.runtime.onMessage.addListener(msg_global_handler);

function clear_state() {
    document.querySelectorAll(".main .subsection, .main .subsection .loading").forEach(div => {
        div.style.display = "none";
    });
}

function show_class(cls) {
    clear_state();
    document.querySelector(`.main .${cls}`).style.display = "block";
}

// page init

state_uninit();
send_msg("start");
