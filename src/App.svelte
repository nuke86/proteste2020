<svelte:head>
	<link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">
</svelte:head>
<script>
	import { onMount } from "svelte";

    const apiURL = 'https://raw.githubusercontent.com/2020PB/police-brutality/data_build/all-locations.json';
	let data = [];
	let obj = {};
	let categorizedByState = {};
	let categorizedByStateAndCity = {};
	$:seenCities = [];
	$:isHome = true;
	$:currState = "";


	onMount(async function() {
        const response = await fetch(apiURL);
		obj = await response.json();
		data = obj.data;
		for (let i = 0; i < data.length; i++) {
			let item = data[i];
			let state = item.state;
			let keys = Object.keys(categorizedByState);
			if (keys.includes(state)) {
				categorizedByState[state] = [...categorizedByState[state], item]; 
			} else {
				categorizedByState[state] = [item];
			}
		}
		console.log(categorizedByState)
		const id = 'twitter-wjs'

        // if script was already set, don't load it again.
        if (document.getElementById(id)) return

        var s = document.createElement('script')
        s.id = id
        s.type = 'text/javascript'
        s.async = true
        s.src = '//platform.twitter.com/widgets.js'
        document.getElementsByTagName('head')[0].appendChild(s)
	});

	function handleClick(state) {
		return () => {
			seenCities = [];
			isHome = false;
			currState = state;
		}
	}

	function updateSeenCities(city) {
		if (seenCities.includes(city)) {
			return false;
		}
		seenCities = [...seenCities, city];
		return true;
	}

	function embed(link) {
		const site = link.slice(12, 18);
		return site;
	}

</script>

<div class="container">
	<h1 id="title" class="animate__animated animate__fadeInDown">Black Lives Matter real-time - Proteste 2020 per George Floyd</h1>
	<h2><b style="color: red;">{data.length}</b> casi di violenza ad opera della Polizia, con testimonianze video</h2>
	<p>Ultimo aggiornamento: <b style="color: green;">{obj.updated_at}</b></p>
	{#each Object.keys(categorizedByState).sort() as state}
			<a class="animate__animated animate__fadeIn" href="/#middle">
				<button class="animate__animated animate__fadeIn" on:click={handleClick(state)}>
					{state}
				</button>
			</a>
	{/each}
	{#if isHome === false} 
		<br><br>
		<hr class="animate__animated animate__fadeIn">
		<a name="middle"></a>
		<h2 class="animate__animated animate__fadeIn">{currState}</h2> 
		<h3>Stiamo monitorando <b style="color: red;">{currState.length}</b> incidenti</h3>
		<p>Segui i link per visionare le testimonianze video</p>
		{#each categorizedByState[currState].reverse() as dataPoint}
			{#if updateSeenCities(dataPoint.city)}
				<h3 class="animate__animated animate__fadeIn">{dataPoint.city}</h3>
			{/if}
			{#if dataPoint.date && dataPoint.date_text}
				<p class="animate__animated animate__fadeIn" id="date">{dataPoint.date + ": " + dataPoint.date_text}</p>
			{:else if dataPoint.date && !dataPoint.date_text}
				<p class="animate__animated animate__fadeIn" id="date">{dataPoint.date}</p>
			{:else if !dataPoint.date && dataPoint.date_text}
				<p class="animate__animated animate__fadeIn" id="date">{dataPoint.date_text}</p>
			{/if}
			<li class="animate__animated animate__fadeIn" id="name">{dataPoint.name}
			<ul>
			{#each dataPoint.links as link} 
				<li><a class="animate__animated animate__fadeIn" href={link} target="_blank">{link}</a></li>
			{/each}
			 {#if embed(dataPoint.links[0]) === 'reddit0'} 
				<iframe>
				<blockquote class="reddit-card" data-card-created="1591095929"><a href={dataPoint.links[0]}>asdf</a></blockquote></iframe>
				<script async src="//embed.redditmedia.com/widgets/platform.js" autoplay="no" charset="UTF-8"></script> 
			 {:else}
				<ul>
				<li>
				<a href="javascript:;" onClick="window.open(
				'{dataPoint.links[0]}', 'Video', 'width=400, height=500, resizable, status, scrollbars=1, location');"> 
				Apri il video
				</a></li></ul>
			{/if}
			</ul>
			</li>
		{/each}
		
	{/if}
	<hr class="animate__animated animate__fadeIn">
	<h3 id="edit" class="animate__animated animate__fadeInDown">Condividi <a href={obj.edit_at} target="_blank"> queste API</a> |.|  
	<b style="color: red">Proteste2020</b> è fatto con il <span class="material-icons">favorite_border</span> 
	da <a href="http://www.spcnet.it">Spcnet</a></h3>

</div>

<style>
#title {
	animation-delay: 0s;
}

#edit {
	animation-delay: .4s;
}

button {
	animation-delay: 1s;
}

.date {
	font-style: italic;
}

.container {
	width: 90%;
	margin: auto;
	margin-bottom: 50px;
}

button {
	border: none;
	font-family: inherit;
	font-size: inherit;
	color: inherit;
	background: none;
	cursor: pointer;
	padding: 10px;
	display: inline-block;
    margin-right: 6px;
    margin-bottom: 6px;
	letter-spacing: 1px;
	outline: none;
	position: relative;
	-webkit-transition: all 0.3s;
	-moz-transition: all 0.3s;
	transition: all 0.3s;
}

button:after {
	content: '';
	position: absolute;
	z-index: -1;
	-webkit-transition: all 0.3s;
	-moz-transition: all 0.3s;
	transition: all 0.3s;
}

button:before {
	font-family: 'icomoon';
	font-style: normal;
	font-weight: normal;
	font-variant: normal;
	text-transform: none;
	line-height: 1;
	position: relative;
	-webkit-font-smoothing: antialiased;
}

button {
	color: #fff;
	background: black;
	-webkit-transition: none;
	-moz-transition: none;
	transition: none;
}

button:active {
	top: 2px;
}

button {
	border: 2px dashed black;
	border-radius: 6px;
}

button:hover {
	background: transparent;
	color: black;
}

/* p, h3, hr, h1, h4, button {
    animation-delay: .4s;
} */

h2 {
	text-decoration: underline;
}

hr {
	border: 1px solid #EEEEEE;
}
</style>