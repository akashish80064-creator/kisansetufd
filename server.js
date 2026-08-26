const app = require("./app");

const PORT =
    process.env.PORT || 3000;

app.listen(
    PORT,
    () => {

        console.log("");
        console.log(
            "================================"
        );

        console.log(
            "       KISANSETU SERVER"
        );

        console.log(
            "================================"
        );

        console.log("");

        console.log(
            "Server running on:"
        );

        console.log(
            `http://localhost:${PORT}`
        );

        console.log("");

        console.log(
            "Your service is live 🌾"
        );

        console.log("");

    }
);
