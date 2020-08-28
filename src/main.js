import App from './App.svelte';

var app = new App({
	target: document.body
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`App is running on port ${ PORT }`);
});

export default app;