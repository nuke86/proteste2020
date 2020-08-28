
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.23.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.23.0 */

    const { Object: Object_1, console: console_1, document: document_1 } = globals;
    const file = "src/App.svelte";

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	return child_ctx;
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i];
    	return child_ctx;
    }

    // (72:1) {#each Object.keys(categorizedByState).sort() as state}
    function create_each_block_2(ctx) {
    	let a;
    	let button;
    	let t_value = /*state*/ ctx[15] + "";
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			a = element("a");
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "animate__animated animate__fadeIn svelte-5wine5");
    			add_location(button, file, 73, 4, 2097);
    			attr_dev(a, "class", "animate__animated animate__fadeIn");
    			attr_dev(a, "href", "/#middle");
    			add_location(a, file, 72, 3, 2031);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, button);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(
    					button,
    					"click",
    					function () {
    						if (is_function(/*handleClick*/ ctx[5](/*state*/ ctx[15]))) /*handleClick*/ ctx[5](/*state*/ ctx[15]).apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*categorizedByState*/ 4 && t_value !== (t_value = /*state*/ ctx[15] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(72:1) {#each Object.keys(categorizedByState).sort() as state}",
    		ctx
    	});

    	return block;
    }

    // (79:1) {#if isHome === false}
    function create_if_block(ctx) {
    	let br0;
    	let br1;
    	let t0;
    	let hr;
    	let t1;
    	let a;
    	let t2;
    	let h2;
    	let t3;
    	let t4;
    	let h3;
    	let t5;
    	let b;
    	let t6_value = /*currState*/ ctx[4].length + "";
    	let t6;
    	let t7;
    	let t8;
    	let p;
    	let t10;
    	let each_1_anchor;
    	let each_value = /*categorizedByState*/ ctx[2][/*currState*/ ctx[4]].reverse();
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			br0 = element("br");
    			br1 = element("br");
    			t0 = space();
    			hr = element("hr");
    			t1 = space();
    			a = element("a");
    			t2 = space();
    			h2 = element("h2");
    			t3 = text(/*currState*/ ctx[4]);
    			t4 = space();
    			h3 = element("h3");
    			t5 = text("Stiamo monitorando ");
    			b = element("b");
    			t6 = text(t6_value);
    			t7 = text(" incidenti");
    			t8 = space();
    			p = element("p");
    			p.textContent = "Segui i link per visionare le testimonianze video";
    			t10 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			add_location(br0, file, 79, 2, 2249);
    			add_location(br1, file, 79, 6, 2253);
    			attr_dev(hr, "class", "animate__animated animate__fadeIn svelte-5wine5");
    			add_location(hr, file, 80, 2, 2260);
    			attr_dev(a, "name", "middle");
    			add_location(a, file, 81, 2, 2309);
    			attr_dev(h2, "class", "animate__animated animate__fadeIn svelte-5wine5");
    			add_location(h2, file, 82, 2, 2333);
    			set_style(b, "color", "red");
    			add_location(b, file, 83, 25, 2422);
    			add_location(h3, file, 83, 2, 2399);
    			add_location(p, file, 84, 2, 2485);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, br0, anchor);
    			insert_dev(target, br1, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, hr, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, a, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, h2, anchor);
    			append_dev(h2, t3);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t5);
    			append_dev(h3, b);
    			append_dev(b, t6);
    			append_dev(h3, t7);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, p, anchor);
    			insert_dev(target, t10, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*currState*/ 16) set_data_dev(t3, /*currState*/ ctx[4]);
    			if (dirty & /*currState*/ 16 && t6_value !== (t6_value = /*currState*/ ctx[4].length + "")) set_data_dev(t6, t6_value);

    			if (dirty & /*categorizedByState, currState, embed, updateSeenCities*/ 84) {
    				each_value = /*categorizedByState*/ ctx[2][/*currState*/ ctx[4]].reverse();
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(br1);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(hr);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(a);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t10);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(79:1) {#if isHome === false}",
    		ctx
    	});

    	return block;
    }

    // (87:3) {#if updateSeenCities(dataPoint.city)}
    function create_if_block_5(ctx) {
    	let h3;
    	let t_value = /*dataPoint*/ ctx[9].city + "";
    	let t;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			t = text(t_value);
    			attr_dev(h3, "class", "animate__animated animate__fadeIn");
    			add_location(h3, file, 87, 4, 2651);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*categorizedByState, currState*/ 20 && t_value !== (t_value = /*dataPoint*/ ctx[9].city + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(87:3) {#if updateSeenCities(dataPoint.city)}",
    		ctx
    	});

    	return block;
    }

    // (94:52) 
    function create_if_block_4(ctx) {
    	let p;
    	let t_value = /*dataPoint*/ ctx[9].date_text + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			attr_dev(p, "class", "animate__animated animate__fadeIn");
    			attr_dev(p, "id", "date");
    			add_location(p, file, 94, 4, 3074);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*categorizedByState, currState*/ 20 && t_value !== (t_value = /*dataPoint*/ ctx[9].date_text + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(94:52) ",
    		ctx
    	});

    	return block;
    }

    // (92:52) 
    function create_if_block_3(ctx) {
    	let p;
    	let t_value = /*dataPoint*/ ctx[9].date + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			attr_dev(p, "class", "animate__animated animate__fadeIn");
    			attr_dev(p, "id", "date");
    			add_location(p, file, 92, 4, 2941);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*categorizedByState, currState*/ 20 && t_value !== (t_value = /*dataPoint*/ ctx[9].date + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(92:52) ",
    		ctx
    	});

    	return block;
    }

    // (90:3) {#if dataPoint.date && dataPoint.date_text}
    function create_if_block_2(ctx) {
    	let p;
    	let t_value = /*dataPoint*/ ctx[9].date + ": " + /*dataPoint*/ ctx[9].date_text + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			attr_dev(p, "class", "animate__animated animate__fadeIn");
    			attr_dev(p, "id", "date");
    			add_location(p, file, 90, 4, 2779);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*categorizedByState, currState*/ 20 && t_value !== (t_value = /*dataPoint*/ ctx[9].date + ": " + /*dataPoint*/ ctx[9].date_text + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(90:3) {#if dataPoint.date && dataPoint.date_text}",
    		ctx
    	});

    	return block;
    }

    // (99:3) {#each dataPoint.links as link}
    function create_each_block_1(ctx) {
    	let li;
    	let a;
    	let t_value = /*link*/ ctx[12] + "";
    	let t;
    	let a_href_value;

    	const block = {
    		c: function create() {
    			li = element("li");
    			a = element("a");
    			t = text(t_value);
    			attr_dev(a, "class", "animate__animated animate__fadeIn");
    			attr_dev(a, "href", a_href_value = /*link*/ ctx[12]);
    			attr_dev(a, "target", "_blank");
    			add_location(a, file, 99, 8, 3292);
    			add_location(li, file, 99, 4, 3288);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, a);
    			append_dev(a, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*categorizedByState, currState*/ 20 && t_value !== (t_value = /*link*/ ctx[12] + "")) set_data_dev(t, t_value);

    			if (dirty & /*categorizedByState, currState*/ 20 && a_href_value !== (a_href_value = /*link*/ ctx[12])) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(99:3) {#each dataPoint.links as link}",
    		ctx
    	});

    	return block;
    }

    // (106:4) {:else}
    function create_else_block(ctx) {
    	let ul;
    	let li;
    	let a;
    	let t;
    	let a_onclick_value;

    	const block = {
    		c: function create() {
    			ul = element("ul");
    			li = element("li");
    			a = element("a");
    			t = text("Apri il video");
    			attr_dev(a, "href", "javascript:;");
    			attr_dev(a, "onclick", a_onclick_value = "window.open(\n\t\t\t\t'" + /*dataPoint*/ ctx[9].links[0] + "', 'Video', 'width=400, height=500, resizable, status, scrollbars=1, location');");
    			add_location(a, file, 108, 4, 3726);
    			add_location(li, file, 107, 4, 3717);
    			add_location(ul, file, 106, 4, 3708);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);
    			append_dev(ul, li);
    			append_dev(li, a);
    			append_dev(a, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*categorizedByState, currState*/ 20 && a_onclick_value !== (a_onclick_value = "window.open(\n\t\t\t\t'" + /*dataPoint*/ ctx[9].links[0] + "', 'Video', 'width=400, height=500, resizable, status, scrollbars=1, location');")) {
    				attr_dev(a, "onclick", a_onclick_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(106:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (102:4) {#if embed(dataPoint.links[0]) === 'reddit0'}
    function create_if_block_1(ctx) {
    	let iframe;
    	let blockquote;
    	let a;
    	let t0;
    	let a_href_value;
    	let t1;
    	let script;
    	let script_src_value;

    	const block = {
    		c: function create() {
    			iframe = element("iframe");
    			blockquote = element("blockquote");
    			a = element("a");
    			t0 = text("asdf");
    			t1 = space();
    			script = element("script");
    			attr_dev(a, "href", a_href_value = /*dataPoint*/ ctx[9].links[0]);
    			add_location(a, file, 103, 67, 3523);
    			attr_dev(blockquote, "class", "reddit-card");
    			attr_dev(blockquote, "data-card-created", "1591095929");
    			add_location(blockquote, file, 103, 4, 3460);
    			add_location(iframe, file, 102, 4, 3447);
    			script.async = true;
    			if (script.src !== (script_src_value = "//embed.redditmedia.com/widgets/platform.js")) attr_dev(script, "src", script_src_value);
    			attr_dev(script, "autoplay", "no");
    			attr_dev(script, "charset", "UTF-8");
    			add_location(script, file, 104, 4, 3587);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, iframe, anchor);
    			append_dev(iframe, blockquote);
    			append_dev(blockquote, a);
    			append_dev(a, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, script, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*categorizedByState, currState*/ 20 && a_href_value !== (a_href_value = /*dataPoint*/ ctx[9].links[0])) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(iframe);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(script);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(102:4) {#if embed(dataPoint.links[0]) === 'reddit0'}",
    		ctx
    	});

    	return block;
    }

    // (86:2) {#each categorizedByState[currState].reverse() as dataPoint}
    function create_each_block(ctx) {
    	let show_if_1 = /*updateSeenCities*/ ctx[6](/*dataPoint*/ ctx[9].city);
    	let t0;
    	let t1;
    	let li;
    	let t2_value = /*dataPoint*/ ctx[9].name + "";
    	let t2;
    	let t3;
    	let ul;
    	let t4;
    	let show_if;
    	let t5;
    	let if_block0 = show_if_1 && create_if_block_5(ctx);

    	function select_block_type(ctx, dirty) {
    		if (/*dataPoint*/ ctx[9].date && /*dataPoint*/ ctx[9].date_text) return create_if_block_2;
    		if (/*dataPoint*/ ctx[9].date && !/*dataPoint*/ ctx[9].date_text) return create_if_block_3;
    		if (!/*dataPoint*/ ctx[9].date && /*dataPoint*/ ctx[9].date_text) return create_if_block_4;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block1 = current_block_type && current_block_type(ctx);
    	let each_value_1 = /*dataPoint*/ ctx[9].links;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	function select_block_type_1(ctx, dirty) {
    		if (show_if == null || dirty & /*categorizedByState, currState*/ 20) show_if = !!(embed(/*dataPoint*/ ctx[9].links[0]) === "reddit0");
    		if (show_if) return create_if_block_1;
    		return create_else_block;
    	}

    	let current_block_type_1 = select_block_type_1(ctx, -1);
    	let if_block2 = current_block_type_1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			li = element("li");
    			t2 = text(t2_value);
    			t3 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t4 = space();
    			if_block2.c();
    			t5 = space();
    			add_location(ul, file, 97, 3, 3243);
    			attr_dev(li, "class", "animate__animated animate__fadeIn");
    			attr_dev(li, "id", "name");
    			add_location(li, file, 96, 3, 3167);
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, li, anchor);
    			append_dev(li, t2);
    			append_dev(li, t3);
    			append_dev(li, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			append_dev(ul, t4);
    			if_block2.m(ul, null);
    			append_dev(li, t5);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*categorizedByState, currState*/ 20) show_if_1 = /*updateSeenCities*/ ctx[6](/*dataPoint*/ ctx[9].city);

    			if (show_if_1) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_5(ctx);
    					if_block0.c();
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if (if_block1) if_block1.d(1);
    				if_block1 = current_block_type && current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(t1.parentNode, t1);
    				}
    			}

    			if (dirty & /*categorizedByState, currState*/ 20 && t2_value !== (t2_value = /*dataPoint*/ ctx[9].name + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*categorizedByState, currState*/ 20) {
    				each_value_1 = /*dataPoint*/ ctx[9].links;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, t4);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_1(ctx, dirty)) && if_block2) {
    				if_block2.p(ctx, dirty);
    			} else {
    				if_block2.d(1);
    				if_block2 = current_block_type_1(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(ul, null);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t0);

    			if (if_block1) {
    				if_block1.d(detaching);
    			}

    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(li);
    			destroy_each(each_blocks, detaching);
    			if_block2.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(86:2) {#each categorizedByState[currState].reverse() as dataPoint}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let link;
    	let t0;
    	let div;
    	let h1;
    	let t2;
    	let h2;
    	let b0;
    	let t3_value = /*data*/ ctx[0].length + "";
    	let t3;
    	let t4;
    	let t5;
    	let p;
    	let t6;
    	let b1;
    	let t7_value = /*obj*/ ctx[1].updated_at + "";
    	let t7;
    	let t8;
    	let t9;
    	let t10;
    	let hr;
    	let t11;
    	let h3;
    	let t12;
    	let a0;
    	let t13;
    	let a0_href_value;
    	let t14;
    	let b2;
    	let t16;
    	let span;
    	let t18;
    	let a1;
    	let each_value_2 = Object.keys(/*categorizedByState*/ ctx[2]).sort();
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let if_block = /*isHome*/ ctx[3] === false && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			link = element("link");
    			t0 = space();
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Black Lives Matter real-time - Proteste 2020 per George Floyd";
    			t2 = space();
    			h2 = element("h2");
    			b0 = element("b");
    			t3 = text(t3_value);
    			t4 = text(" casi di violenza ad opera della Polizia, con testimonianze video");
    			t5 = space();
    			p = element("p");
    			t6 = text("Ultimo aggiornamento: ");
    			b1 = element("b");
    			t7 = text(t7_value);
    			t8 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t9 = space();
    			if (if_block) if_block.c();
    			t10 = space();
    			hr = element("hr");
    			t11 = space();
    			h3 = element("h3");
    			t12 = text("Condividi ");
    			a0 = element("a");
    			t13 = text("queste API");
    			t14 = text(" |.|  \n\t");
    			b2 = element("b");
    			b2.textContent = "Proteste2020";
    			t16 = text(" è fatto con il ");
    			span = element("span");
    			span.textContent = "favorite_border";
    			t18 = text(" \n\tda ");
    			a1 = element("a");
    			a1.textContent = "Spcnet";
    			attr_dev(link, "rel", "stylesheet");
    			attr_dev(link, "href", "https://fonts.googleapis.com/icon?family=Material+Icons");
    			add_location(link, file, 1, 1, 15);
    			attr_dev(h1, "id", "title");
    			attr_dev(h1, "class", "animate__animated animate__fadeInDown svelte-5wine5");
    			add_location(h1, file, 68, 1, 1651);
    			set_style(b0, "color", "red");
    			add_location(b0, file, 69, 5, 1784);
    			attr_dev(h2, "class", "svelte-5wine5");
    			add_location(h2, file, 69, 1, 1780);
    			set_style(b1, "color", "green");
    			add_location(b1, file, 70, 26, 1921);
    			add_location(p, file, 70, 1, 1896);
    			attr_dev(hr, "class", "animate__animated animate__fadeIn svelte-5wine5");
    			add_location(hr, file, 118, 1, 3965);
    			attr_dev(a0, "href", a0_href_value = /*obj*/ ctx[1].edit_at);
    			attr_dev(a0, "target", "_blank");
    			add_location(a0, file, 119, 71, 4083);
    			set_style(b2, "color", "red");
    			add_location(b2, file, 120, 1, 4144);
    			attr_dev(span, "class", "material-icons");
    			add_location(span, file, 120, 55, 4198);
    			attr_dev(a1, "href", "http://www.spcnet.it");
    			add_location(a1, file, 121, 4, 4255);
    			attr_dev(h3, "id", "edit");
    			attr_dev(h3, "class", "animate__animated animate__fadeInDown svelte-5wine5");
    			add_location(h3, file, 119, 1, 4013);
    			attr_dev(div, "class", "container svelte-5wine5");
    			add_location(div, file, 67, 0, 1626);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document_1.head, link);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t2);
    			append_dev(div, h2);
    			append_dev(h2, b0);
    			append_dev(b0, t3);
    			append_dev(h2, t4);
    			append_dev(div, t5);
    			append_dev(div, p);
    			append_dev(p, t6);
    			append_dev(p, b1);
    			append_dev(b1, t7);
    			append_dev(div, t8);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(div, t9);
    			if (if_block) if_block.m(div, null);
    			append_dev(div, t10);
    			append_dev(div, hr);
    			append_dev(div, t11);
    			append_dev(div, h3);
    			append_dev(h3, t12);
    			append_dev(h3, a0);
    			append_dev(a0, t13);
    			append_dev(h3, t14);
    			append_dev(h3, b2);
    			append_dev(h3, t16);
    			append_dev(h3, span);
    			append_dev(h3, t18);
    			append_dev(h3, a1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*data*/ 1 && t3_value !== (t3_value = /*data*/ ctx[0].length + "")) set_data_dev(t3, t3_value);
    			if (dirty & /*obj*/ 2 && t7_value !== (t7_value = /*obj*/ ctx[1].updated_at + "")) set_data_dev(t7, t7_value);

    			if (dirty & /*handleClick, Object, categorizedByState*/ 36) {
    				each_value_2 = Object.keys(/*categorizedByState*/ ctx[2]).sort();
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, t9);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}

    			if (/*isHome*/ ctx[3] === false) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div, t10);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*obj*/ 2 && a0_href_value !== (a0_href_value = /*obj*/ ctx[1].edit_at)) {
    				attr_dev(a0, "href", a0_href_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			detach_dev(link);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const apiURL = "https://raw.githubusercontent.com/2020PB/police-brutality/data_build/all-locations.json";

    function embed(link) {
    	const site = link.slice(12, 18);
    	return site;
    }

    function instance($$self, $$props, $$invalidate) {
    	let data = [];
    	let obj = {};
    	let categorizedByState = {};
    	let categorizedByStateAndCity = {};

    	onMount(async function () {
    		const response = await fetch(apiURL);
    		$$invalidate(1, obj = await response.json());
    		$$invalidate(0, data = obj.data);

    		for (let i = 0; i < data.length; i++) {
    			let item = data[i];
    			let state = item.state;
    			let keys = Object.keys(categorizedByState);

    			if (keys.includes(state)) {
    				$$invalidate(2, categorizedByState[state] = [...categorizedByState[state], item], categorizedByState);
    			} else {
    				$$invalidate(2, categorizedByState[state] = [item], categorizedByState);
    			}
    		}

    		console.log(categorizedByState);
    		const id = "twitter-wjs";

    		// if script was already set, don't load it again.
    		if (document.getElementById(id)) return;

    		var s = document.createElement("script");
    		s.id = id;
    		s.type = "text/javascript";
    		s.async = true;
    		s.src = "//platform.twitter.com/widgets.js";
    		document.getElementsByTagName("head")[0].appendChild(s);
    	});

    	function handleClick(state) {
    		return () => {
    			seenCities = [];
    			$$invalidate(3, isHome = false);
    			$$invalidate(4, currState = state);
    		};
    	}

    	function updateSeenCities(city) {
    		if (seenCities.includes(city)) {
    			return false;
    		}

    		seenCities = [...seenCities, city];
    		return true;
    	}

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$capture_state = () => ({
    		onMount,
    		apiURL,
    		data,
    		obj,
    		categorizedByState,
    		categorizedByStateAndCity,
    		handleClick,
    		updateSeenCities,
    		embed,
    		seenCities,
    		isHome,
    		currState
    	});

    	$$self.$inject_state = $$props => {
    		if ("data" in $$props) $$invalidate(0, data = $$props.data);
    		if ("obj" in $$props) $$invalidate(1, obj = $$props.obj);
    		if ("categorizedByState" in $$props) $$invalidate(2, categorizedByState = $$props.categorizedByState);
    		if ("categorizedByStateAndCity" in $$props) categorizedByStateAndCity = $$props.categorizedByStateAndCity;
    		if ("seenCities" in $$props) seenCities = $$props.seenCities;
    		if ("isHome" in $$props) $$invalidate(3, isHome = $$props.isHome);
    		if ("currState" in $$props) $$invalidate(4, currState = $$props.currState);
    	};

    	let seenCities;
    	let isHome;
    	let currState;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	 seenCities = [];
    	 $$invalidate(3, isHome = true);
    	 $$invalidate(4, currState = "");

    	return [
    		data,
    		obj,
    		categorizedByState,
    		isHome,
    		currState,
    		handleClick,
    		updateSeenCities
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
