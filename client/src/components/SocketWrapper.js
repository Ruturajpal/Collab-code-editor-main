// src/components/SocketWrapper.js

import React, { useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";

// Helper: attach socket prop to all children
function addPropsToReactElement(element, props) {
    if (React.isValidElement(element)) {
        return React.cloneElement(element, props);
    }
    return element;
}

function addPropsToChildren(children, props) {
    if (!Array.isArray(children)) {
        return addPropsToReactElement(children, props);
    }
    return children.map(childElement =>
        addPropsToReactElement(childElement, props)
    );
}

export default function SocketWrapper({ children }) {
    const socketRef = useRef(null);
    const { roomId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    // ---------------------------
    // Create socket only once
    // ---------------------------
    if (!socketRef.current) {
        socketRef.current = io(
            process.env.REACT_APP_WEB_SOCKET_URL || "http://localhost:5000",
            {
                transports: ["websocket"],   // fast and stable
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 500,
            }
        );
    }

    const socket = socketRef.current;

    // ---------------------------
    // On mount: join room
    // ---------------------------
    useEffect(() => {
        const username = location.state?.username;

        if (!username) {
            toast.error("No username provided");
            navigate("/", { replace: true });
            return;
        }

        // Notify backend that this user joined
        socket.emit("when a user joins", {
            roomId,
            username
        });

        // Cleanup on unmount
        return () => {
            try {
                socket.emit("leave room", { roomId });
                socket.disconnect();
            } catch (e) {}
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId]);

    // ---------------------------
    // Render children only if username exists
    // ---------------------------
    if (!location.state?.username) {
        return (
            <div className="room">
                <h2>No username provided. Please join from home page.</h2>
            </div>
        );
    }

    // Inject socket into children
    return <div>{addPropsToChildren(children, { socket })}</div>;
}
