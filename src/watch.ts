import { FSWatcher } from 'chokidar';
import { Stats } from 'fs';


type WatcherCallback = (eventName: 'add'|'addDir'|'change'|'unlink'|'unlinkDir', path: string, stats?: Stats)=>any;
let watcherMap = new Map<string,WatcherCallback>();
let watcher = new FSWatcher({persistent:true});

function watcherCb(eventName:'add'|'addDir'|'change'|'unlink'|'unlinkDir', filename:string, stats:Stats|undefined): void
{
	if( watcherMap.has(filename) )
	{
		return watcherMap.get(filename)(eventName, filename, stats);
	}
}

export function startWatch(filename:string, callback:WatcherCallback)
{
	if(!watcherMap.has(filename))
	{
		watcher.add(filename);
		if(watcher.listenerCount("change")=== 0)
		{
			watcher.on("all", watcherCb);
		}
	}
	watcherMap.set(filename, callback);
}
export function stopWatch(filename:string):void
{
	if(watcherMap.has(filename))
	{
		watcherMap.delete(filename);
		watcher.unwatch(filename);
	}
}

export function disposeWatch():void
{
	watcher.close();
	watcher = null;
}
