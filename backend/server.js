import express from "express";
import axios from "axios";
import qs from "qs";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;
const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;

const getAccessToken = async () => {
    try {
        const response = await axios.post(
            "https://zoom.us/oauth/token",
            qs.stringify({ grant_type: "account_credentials", account_id: ZOOM_ACCOUNT_ID }),
            {
                headers: {
                    Authorization: `Basic ${Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString("base64")}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );
        return response.data.access_token;
    } catch (error) {
        console.error("Error fetching access token:", error.response?.data || error.message);
        throw new Error("Failed to get Zoom access token");
    }
};

app.post("/create-meeting", async (req, res) => {
    try {
        const { duration } = req.body;

        // Validate duration
        const allowedDurations = [1, 15, 30, 45, 60];
        if (!allowedDurations.includes(duration)) {
            return res.status(400).json({ error: "Invalid duration. Allowed: 1, 15, 30, 45, 60 minutes" });
        }

        const accessToken = await getAccessToken();
        const meetingConfig = {
            topic: "Consultancy Video Call",
            type: 2, // Scheduled Meeting
            duration,
            timezone: "UTC",
            settings: {
                host_video: true,
                participant_video: true,
                join_before_host: false, // Ensure only the host can start
                mute_upon_entry: true,
            },
        };

        const response = await axios.post(
            "https://api.zoom.us/v2/users/me/meetings",
            meetingConfig,
            { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
        );

        res.json({ 
            meeting_id: response.data.id, 
            start_url: response.data.start_url,  // Host's meeting link
            join_url: response.data.join_url    // Participant's meeting link
        });
    } catch (error) {
        console.error("Error creating meeting:", error.response?.data || error.message);
        res.status(500).json({ error: "Error creating Zoom meeting" });
    }
});

app.listen(5000, () => console.log("Server running on port 5000"));
