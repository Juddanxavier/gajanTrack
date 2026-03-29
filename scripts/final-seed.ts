async function seed() {
  const baseUrl = "http://localhost:3000";
  
  console.log("Checking connectivity via /api/auth/get-session (or similar)...");
  try {
    const url = `${baseUrl}/api/auth/sign-up/email`;
    const payload = {
      email: "killerbean122@gmail.com",
      password: "welcome2",
      name: "Killer Bean"
    };

    console.log("Calling Better Auth sign-up endpoint...");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const body = await response.text();
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${body}`);

    if (response.ok) {
        console.log("User seeded successfully!");
    } else {
        console.error("Failed to seed user via API.");
    }
  } catch (error) {
    console.error("Network error:", error);
  }
}

seed();
