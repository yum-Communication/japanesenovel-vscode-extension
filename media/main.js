
var yLeftScroll = undefined;
var enableEvent = true;


(function () {
	const vscode = acquireVsCodeApi();

	var D = document;
	var byId = k => D.getElementById(k);
	var $on = (e, t, f) => { if((typeof e)==='string')e=byId(e); if(e)e.addEventListener(t,f); }

	var e = byId('main-contents');

	$on(D, 'scroll', event =>{
		if(enableEvent)
		{
			if(yLeftScroll === undefined)
			{
				setTimeout(()=>
				{
					vscode.postMessage({command:"scroll", value: yLeftScroll});
					yLeftScroll = undefined;
				},1000);
			}
			yLeftScroll = event.srcElement.scrollingElement.scrollLeft;
		}
		enableEvent = true;
	});

	$on(window, 'message', event => {
		const message = event.data;
		switch (message.command) {
			case 'scroll':
				enableEvent = false;
				D.scrollingElement.scrollLeft = message.value
				break;
		}
		return true;
	});


}());
