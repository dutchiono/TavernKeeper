
// using native fetch

async function run() {
    try {
        // url from logs
        const url = "http://localhost:3000/api/heroes?userId=0x8DFBdEEC8c5d4970BB5F481C6ec7f73fa1C65be5";
        console.log("Fetching:", url);
        const res = await fetch(url);
        console.log("Status:", res.status);
        const body = await res.text();
        console.log("Body:", body);
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
