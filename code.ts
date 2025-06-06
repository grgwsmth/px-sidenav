// Show UI and set size
figma.showUI(__html__);

figma.ui.resize(600,800);

// Track our navigation components
interface NavData {
	parents: Array<{
		id: string;
		label: string;
		children: Array<{
			id: string;
			label: string;
		}>;
	}>;
}

// Component keys for the navigation elements
const COMPONENT_KEYS = {
	PARENT_LINK: "13c44fe13f8dde5e2b71e7396b8cec831e61113d",
	CHILD_LINK: "24def9ec4389e2bb91bc2d29298a608e3bf9d7cd"
};

// Keep track of created nodes
const createdNodes: { [key: string]: SceneNode } = {};

// Add type definitions at the top
interface VariantProperty {
	type: string;
	variantOptions?: string[];
}

// Imports a component by its key, returns null if not found
async function getComponent(key: string): Promise<ComponentNode | null> {
	try {
		return await figma.importComponentByKeyAsync(key);
	} catch (error) {
		console.error(`Error importing component with key ${key}:`, error);
		return null;
	}
}

// Handles all UI messages and triggers appropriate actions
figma.ui.onmessage = async (msg) => {
	switch (msg.type) {
		case 'add-parent':
			console.log('Parent added in UI');
				break;

		case 'add-child':
			console.log('Child added to parent', msg.parentId);
				break;

		case 'remove-parent':
			console.log('Parent removed', msg.parentId);
				break;

		case 'remove-child':
			console.log('Child removed', msg.childId, 'from parent', msg.parentId);
				break;

		case 'create-nav':
			await createNavigation(msg.data);
				break;

		default:
			console.log('Unknown message type:', msg.type);
	}
};

// Logs detailed information about a component's properties and variants
async function logComponentProperties(component: ComponentNode | InstanceNode) {
	// Handle instance properties
	if (component.type === "INSTANCE") {
		console.log('Instance Properties:', {
			name: component.name,
			componentProperties: component.componentProperties,
			variantProperties: component.variantProperties
		});
	} 
	// Handle component properties
	else if (component.type === "COMPONENT") {
		const mainComponent = component.parent?.type === "COMPONENT_SET" ? component.parent : component;
		console.log('Component Properties:', {
			name: component.name,
			isVariant: component.parent?.type === "COMPONENT_SET",
			variantProperties: component.parent?.type === "COMPONENT_SET" ? component.parent.componentPropertyDefinitions : component.componentPropertyDefinitions
		});
	}
}

// Creates a complete navigation system with parent and child components
async function createNavigation(data: NavData) {
	try {
		// Load required fonts
		await figma.loadFontAsync({ family: "Everyday Sans UI", style: "Regular" });
		await figma.loadFontAsync({ family: "Everyday Sans UI", style: "Medium" });

		// Import required components
		const parentLinkComponent = await figma.importComponentByKeyAsync(COMPONENT_KEYS.PARENT_LINK);
		const childLinkComponent = await figma.importComponentByKeyAsync(COMPONENT_KEYS.CHILD_LINK);

		if (!parentLinkComponent || !childLinkComponent) {
			throw new Error('Required components not found in library');
		}

		const spacing = 40;
		let yPosition = 0;
		const createdComponentSets: ComponentSetNode[] = [];

		// Create frames for each parent and their children
		for (const parent of data.parents) {
			const parentFrames: FrameNode[] = [];

			// Create default parent frame
			const parentDefaultFrame = figma.createFrame();
			parentDefaultFrame.name = `Variant=${parent.label}`;
			parentDefaultFrame.layoutMode = "VERTICAL";
			parentDefaultFrame.counterAxisSizingMode = "FIXED";
			parentDefaultFrame.resize(240, parentDefaultFrame.height);
			parentDefaultFrame.itemSpacing = 4;

			// Add parent instance (not current)
			const parentDefaultInstance = parentLinkComponent.createInstance();
			parentDefaultInstance.layoutAlign = "STRETCH";
			if (parentDefaultInstance.type === "INSTANCE") {
				// Set text
				const textNode = parentDefaultInstance.findOne(node => node.type === "TEXT") as TextNode;
				if (textNode) textNode.characters = parent.label;

				// Set properties for parent variant
				parentDefaultInstance.setProperties({
					"Variant": "Parent",
					"isCurrent": "False"
				});
			}
			parentDefaultFrame.appendChild(parentDefaultInstance);
			parentFrames.push(parentDefaultFrame);

			// Create variants for parent with children
			if (parent.children && parent.children.length > 0) {
				// Create parent current variant with all children not current
				const parentCurrentFrame = figma.createFrame();
				parentCurrentFrame.name = `Variant=${parent.label} Current`;
				parentCurrentFrame.layoutMode = "VERTICAL";
				parentCurrentFrame.counterAxisSizingMode = "FIXED";
				parentCurrentFrame.resize(240, parentCurrentFrame.height);
				parentCurrentFrame.itemSpacing = 4;

				// Add parent instance (current)
				const parentCurrentInstance = parentLinkComponent.createInstance();
				parentCurrentInstance.layoutAlign = "STRETCH";
				if (parentCurrentInstance.type === "INSTANCE") {
					// Set text
					const textNode = parentCurrentInstance.findOne(node => node.type === "TEXT") as TextNode;
					if (textNode) textNode.characters = parent.label;

					// Set properties for parent variant
					parentCurrentInstance.setProperties({
						"Variant": "Parent",
						"isCurrent": "True"
					});
				}
				parentCurrentFrame.appendChild(parentCurrentInstance);

				// Add all children (not current)
				parent.children.forEach(child => {
					const childInstance = childLinkComponent.createInstance();
					childInstance.layoutAlign = "STRETCH";
					if (childInstance.type === "INSTANCE") {
						// Set text
						const textNode = childInstance.findOne(node => node.type === "TEXT") as TextNode;
						if (textNode) textNode.characters = child.label;

						// Set properties for child instance
						childInstance.setProperties({
							"Variant": "Child",
							"isCurrent": "False"
						});
					}
					parentCurrentFrame.appendChild(childInstance);
				});

				parentFrames.push(parentCurrentFrame);

				// Create variants for each active child
				parent.children.forEach((activeChild, activeChildIndex) => {
					const childFrame = figma.createFrame();
					childFrame.name = `Variant=${activeChild.label}`;
					childFrame.layoutMode = "VERTICAL";
					childFrame.counterAxisSizingMode = "FIXED";
					childFrame.resize(240, childFrame.height);
					childFrame.itemSpacing = 4;

					// Add parent instance (not current)
					const parentInst = parentLinkComponent.createInstance();
					parentInst.layoutAlign = "STRETCH";
					if (parentInst.type === "INSTANCE") {
						// Set text
						const textNode = parentInst.findOne(node => node.type === "TEXT") as TextNode;
						if (textNode) textNode.characters = parent.label;

						// Set properties for parent in child variant
						parentInst.setProperties({
							"Variant": "Parent",
							"isCurrent": "False"
						});
					}
					childFrame.appendChild(parentInst);

					// Add all children with current state
					parent.children.forEach((child, index) => {
						const childInstance = childLinkComponent.createInstance();
						childInstance.layoutAlign = "STRETCH";
						if (childInstance.type === "INSTANCE") {
							// Set text
							const textNode = childInstance.findOne(node => node.type === "TEXT") as TextNode;
							if (textNode) textNode.characters = child.label;

							// Set properties for child instance
							childInstance.setProperties({
								"Variant": "Child",
								"isCurrent": index === activeChildIndex ? "True" : "False"
							});
						}
						childFrame.appendChild(childInstance);
					});

					parentFrames.push(childFrame);
				});
			}

			// Position frames horizontally
			parentFrames.forEach((frame, index) => {
				frame.x = index * (frame.width + spacing);
				frame.y = 0;
			});

			// Convert frames to components
			const components: ComponentNode[] = parentFrames.map(frame => {
				const component = figma.createComponent();
				component.name = frame.name;
				component.resize(frame.width, frame.height);
				component.layoutMode = frame.layoutMode;
				component.counterAxisSizingMode = frame.counterAxisSizingMode;
				component.itemSpacing = frame.itemSpacing;
				
				while (frame.children.length > 0) {
					component.appendChild(frame.children[0]);
				}
				
				frame.remove();
				
				return component;
			});

			let finalNode: ComponentNode | ComponentSetNode;

			// Create component set or use single component
			if (components.length > 1) {
				// Create and style component set
				const componentSet = figma.combineAsVariants(components, figma.currentPage);
				componentSet.name = `${parent.label} group`;
				componentSet.layoutMode = "HORIZONTAL";
				componentSet.counterAxisSizingMode = "AUTO";
				
				// Add spacing and padding
				componentSet.itemSpacing = 16;
				componentSet.paddingLeft = 16;
				componentSet.paddingRight = 16;
				componentSet.paddingTop = 16;
				componentSet.paddingBottom = 16;

				// Add dashed stroke
				componentSet.strokes = [{
					type: "SOLID",
					color: { 
						r: parseInt("97", 16) / 255,
						g: parseInt("47", 16) / 255,
						b: parseInt("FF", 16) / 255
					}
				}];
				componentSet.strokeWeight = 1;
				componentSet.dashPattern = [10, 5];
				componentSet.strokeAlign = "INSIDE";

				finalNode = componentSet;
			} else {
				finalNode = components[0];
			}

			// Position vertically
			finalNode.y = yPosition;
			yPosition += finalNode.height + spacing;

			createdComponentSets.push(finalNode as ComponentSetNode);
		}

		// Create main navigation frame
		const instancesFrame = figma.createFrame();
		instancesFrame.name = "MySideNav";
		instancesFrame.layoutMode = "VERTICAL";
		instancesFrame.itemSpacing = 4;
		instancesFrame.paddingLeft = 0;
		instancesFrame.paddingRight = 0;
		instancesFrame.paddingTop = 0;
		instancesFrame.paddingBottom = 0;
		instancesFrame.fills = [];
		instancesFrame.resize(240, instancesFrame.height);
		instancesFrame.primaryAxisSizingMode = "AUTO";
		instancesFrame.counterAxisSizingMode = "FIXED";

		// Position frame
		let maxX = 0;
		createdComponentSets.forEach(set => {
			maxX = Math.max(maxX, set.x + set.width);
		});
		instancesFrame.x = maxX + spacing;
		instancesFrame.y = 0;

		// Add home link
		const topParentInstance = parentLinkComponent.createInstance();
		if (topParentInstance.type === "INSTANCE") {
			topParentInstance.layoutAlign = "STRETCH";
			const textNode = topParentInstance.findOne(node => node.type === "TEXT") as TextNode;
			if (textNode) textNode.characters = "Home";
			topParentInstance.setProperties({
				"Variant": "Parent",
				"isCurrent": "False"
			});
		}
		instancesFrame.appendChild(topParentInstance);

		// Add component instances
		createdComponentSets.forEach(componentSet => {
			const firstVariant = componentSet.children[0] as ComponentNode;
			const instance = firstVariant.createInstance();
			if (instance.type === "INSTANCE") {
				instance.layoutAlign = "STRETCH";
			}
			instancesFrame.appendChild(instance);
		});

		// Create final navigation component
		const navComponent = figma.createComponent();
		navComponent.name = "MySideNav";
		navComponent.resize(240, instancesFrame.height);
		navComponent.layoutMode = "VERTICAL";
		navComponent.itemSpacing = 4;
		navComponent.paddingLeft = 0;
		navComponent.paddingRight = 0;
		navComponent.paddingTop = 0;
		navComponent.paddingBottom = 0;
		navComponent.fills = [];
		navComponent.primaryAxisSizingMode = "AUTO";
		navComponent.counterAxisSizingMode = "FIXED";

		// Transfer instances to component
		while (instancesFrame.children.length > 0) {
			const child = instancesFrame.children[0];
			if (child.type === "INSTANCE") {
				child.layoutAlign = "STRETCH";
			}
			navComponent.appendChild(child);
		}

		navComponent.x = instancesFrame.x;
		navComponent.y = instancesFrame.y;
		instancesFrame.remove();

		// Create wrapper component
		const mySideNavInstance = navComponent.createInstance();
		const wrapperComponent = figma.createComponent();
		wrapperComponent.name = "[PX] SideNav-MySideNav";
		wrapperComponent.layoutMode = "VERTICAL";
		wrapperComponent.resize(240, wrapperComponent.height);
		wrapperComponent.primaryAxisSizingMode = "AUTO";
		wrapperComponent.counterAxisSizingMode = "FIXED";
		wrapperComponent.itemSpacing = 0;
		wrapperComponent.paddingLeft = 0;
		wrapperComponent.paddingRight = 0;
		wrapperComponent.paddingTop = 0;
		wrapperComponent.paddingBottom = 0;
		wrapperComponent.fills = [];

		if (mySideNavInstance.type === "INSTANCE") {
			mySideNavInstance.layoutAlign = "STRETCH";
		}
		wrapperComponent.appendChild(mySideNavInstance);
		wrapperComponent.x = navComponent.x + navComponent.width + spacing;
		wrapperComponent.y = 0;

		// Update selection and notify completion
		figma.currentPage.selection = [...createdComponentSets, navComponent, wrapperComponent];
		figma.notify(`Created ${createdComponentSets.length} navigation components and assembled them into a navigation system! 🎉`);
	} catch (error) {
		console.error('Error creating navigation:', error);
		figma.notify("Error: Could not create navigation. Check console for details.", { error: true });
	}
}

// Debug helper function to inspect and log component properties and structure
async function inspectSelectedComponent() {
	// Check if component is selected
	if (figma.currentPage.selection.length === 0) {
		console.log('Please select a component instance');
		return;
	}

	const selected = figma.currentPage.selection[0];
	if (selected.type !== "INSTANCE") {
		console.log('Selected item is not a component instance');
		return;
	}

	// Log basic properties
	console.log('Instance Properties:', {
		name: selected.name,
		type: selected.type,
		id: selected.id
	});

	// Log variant properties
	console.log('Variant Properties:', {
		variantProperties: selected.variantProperties,
		componentProperties: selected.componentProperties
	});

	// Log text nodes
	const textNodes = selected.findAll(node => node.type === "TEXT");
	console.log('Text Nodes:', textNodes.map(node => {
		if (node.type === "TEXT") {
			return {
				characters: node.characters,
				name: node.name
			};
		}
		return {
			name: node.name
		};
	}));

	// Log main component info
	const mainComponent = await selected.getMainComponentAsync();
	if (mainComponent) {
		console.log('Main Component:', {
			key: mainComponent.key,
			name: mainComponent.name,
			description: mainComponent.description,
			remote: mainComponent.remote
		});
	}
}

// Run the inspection
inspectSelectedComponent();