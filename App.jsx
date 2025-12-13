import React, { useState } from "react";

export default function App() {
  const [user, setUser] = useState(null);
  const [announcement, setAnnouncement] = useState(
    "Welcome to All Ohio Roofing Training Portal"
  );

  const courses = [
    {
      title: "Daily Motivation",
      video: "https://www.youtube.com/embed/zf0KZlHyJDQ",
    },
    {
      title: "Roof Inspection",
      video: "https://www.youtube.com/embed/zXLGnIpa2vA",
    },
    {
      title: "Sales Pitch",
      video: "https://www.youtube.com/embed/FqmfjNJB4tE",
    },
    {
      title: "Repair Attempt",
      video: "https://www.youtube.com/embed/SeGxoy2bazc",
    },
  ];

  return (
    <div style={{ background: "#0f0f0f", color: "white", minHeight: "100vh", padding: 20 }}>
      <h1>All Ohio Roofing Training</h1>

      {!user ? (
        <button onClick={() => setUser("Rep Logged In")}>
          Login (Demo)
        </button>
      ) : (
        <>
          <h2>{announcement}</h2>

          <h3>Training Videos</h3>
          {courses.map((c) => (
            <div key={c.title} style={{ marginBottom: 30 }}>
              <h4>{c.title}</h4>
              <iframe
                width="100%"
                height="315"
                src={c.video}
                title={c.title}
                allowFullScreen
              ></iframe>
            </div>
          ))}

          <h3>Leaderboard (Demo)</h3>
          <ul>
            <li>Noah – $42,000</li>
            <li>Rep A – $28,000</li>
            <li>Rep B – $17,000</li>
          </ul>
        </>
      )}
    </div>
  );
}
