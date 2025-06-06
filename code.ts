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

async function getComponent(key: string): Promise<ComponentNode | null> {
	try {
		return await figma.importComponentByKeyAsync(key);
	} catch (error) {
		console.error(`Error importing component with key ${key}:`, error);
		return null;
	}
}

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

// Helper function to log component properties
async function logComponentProperties(component: ComponentNode | InstanceNode) {
	if (component.type === "INSTANCE") {
		console.log('Instance Properties:', {
			name: component.name,
			componentProperties: component.componentProperties,
			variantProperties: component.variantProperties
		});
	} else if (component.type === "COMPONENT") {
		// For component variants, get the parent component set if it exists
		const mainComponent = component.parent?.type === "COMPONENT_SET" ? component.parent : component;
		console.log('Component Properties:', {
			name: component.name,
			isVariant: component.parent?.type === "COMPONENT_SET",
			variantProperties: component.parent?.type === "COMPONENT_SET" ? component.parent.componentPropertyDefinitions : component.componentPropertyDefinitions
		});
	}
}

async function createNavigation(data: NavData) {
	try {
		// Load required fonts first
		await figma.loadFontAsync({ family: "Everyday Sans UI", style: "Regular" });
		await figma.loadFontAsync({ family: "Everyday Sans UI", style: "Medium" });

		// Get the component references
		const parentLinkComponent = await figma.importComponentByKeyAsync(COMPONENT_KEYS.PARENT_LINK);
		const childLinkComponent = await figma.importComponentByKeyAsync(COMPONENT_KEYS.CHILD_LINK);

		if (!parentLinkComponent || !childLinkComponent) {
			throw new Error('Required components not found in library');
		}

		const spacing = 40;
		let yPosition = 0;
		const createdComponentSets: ComponentSetNode[] = [];

		// Create frames for each parent
		for (const parent of data.parents) {
			const parentFrames: FrameNode[] = [];

			// Create a frame for this parent (default state)
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

			// If there are children, create parent current variant first
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

					// Add all children
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

			// Position frames horizontally for this parent's component set
			parentFrames.forEach((frame, index) => {
				frame.x = index * (frame.width + spacing);
				frame.y = 0;
			});

			// Convert frames to components
			const components: ComponentNode[] = parentFrames.map(frame => {
				const component = figma.createComponent();
				// Copy all properties from frame to component
				component.name = frame.name;
				component.resize(frame.width, frame.height);
				component.layoutMode = frame.layoutMode;
				component.counterAxisSizingMode = frame.counterAxisSizingMode;
				component.itemSpacing = frame.itemSpacing;
				
				// Move all children from frame to component
				while (frame.children.length > 0) {
					component.appendChild(frame.children[0]);
				}
				
				// Remove the original frame
				frame.remove();
				
				return component;
			});

			let finalNode: ComponentNode | ComponentSetNode;

			// Only create a component set if there are multiple variants (i.e., has children)
			if (components.length > 1) {
				// Create component set for this parent
				const componentSet = figma.combineAsVariants(components, figma.currentPage);
				componentSet.name = `${parent.label} group`;
				componentSet.layoutMode = "HORIZONTAL";
				componentSet.counterAxisSizingMode = "AUTO";
				// componentSet.fills = [];
				
				// Add dashed stroke and auto-layout spacing
				componentSet.itemSpacing = 16; // Horizontal gap between objects
				componentSet.paddingLeft = 16; // Horizontal padding
				componentSet.paddingRight = 16; // Horizontal padding
				componentSet.paddingTop = 16; // Vertical padding
				componentSet.paddingBottom = 16; // Vertical padding

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
				// Just use the single component
				finalNode = components[0];
			}

			// Position vertically
			finalNode.y = yPosition;
			yPosition += finalNode.height + spacing;

			createdComponentSets.push(finalNode as ComponentSetNode);
		}

		// Create a frame containing instances of the first variant from each component set
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

		// Position the instances frame to the right of the component sets
		let maxX = 0;
		createdComponentSets.forEach(set => {
			maxX = Math.max(maxX, set.x + set.width);
		});
		instancesFrame.x = maxX + spacing;
		instancesFrame.y = 0;

		// Add initial parent instance at the top
		const topParentInstance = parentLinkComponent.createInstance();
		if (topParentInstance.type === "INSTANCE") {
			topParentInstance.layoutAlign = "STRETCH";
			// Set text
			const textNode = topParentInstance.findOne(node => node.type === "TEXT") as TextNode;
			if (textNode) textNode.characters = "Home";
			// Set properties
			topParentInstance.setProperties({
				"Variant": "Parent",
				"isCurrent": "False"
			});
		}
		instancesFrame.appendChild(topParentInstance);

		// Add an instance of the first variant from each component set
		createdComponentSets.forEach(componentSet => {
			const firstVariant = componentSet.children[0] as ComponentNode;
			const instance = firstVariant.createInstance();
			if (instance.type === "INSTANCE") {
				instance.layoutAlign = "STRETCH";  // Set to Fill container width
			}
			instancesFrame.appendChild(instance);
		});

		// Convert the frame to a component
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
		navComponent.primaryAxisSizingMode = "AUTO";     // Hug height
		navComponent.counterAxisSizingMode = "FIXED";    // Fixed width

		// Move all instances from the frame to the component
		while (instancesFrame.children.length > 0) {
			const child = instancesFrame.children[0];
			if (child.type === "INSTANCE") {
				child.layoutAlign = "STRETCH";  // Ensure Fill setting is maintained
			}
			navComponent.appendChild(child);
		}

		// Position the component where the frame was
		navComponent.x = instancesFrame.x;
		navComponent.y = instancesFrame.y;

		// Remove the original frame
		instancesFrame.remove();

		// Create an instance of MySideNav
		const mySideNavInstance = navComponent.createInstance();
		
		// Create the wrapper frame and set it up as a component
		const wrapperComponent = figma.createComponent();
		wrapperComponent.name = "[PX] SideNav-MySideNav";
		wrapperComponent.layoutMode = "VERTICAL";
		wrapperComponent.resize(240, wrapperComponent.height);
		wrapperComponent.primaryAxisSizingMode = "AUTO";     // Hug height
		wrapperComponent.counterAxisSizingMode = "FIXED";    // Fixed width
		wrapperComponent.itemSpacing = 0;
		wrapperComponent.paddingLeft = 0;
		wrapperComponent.paddingRight = 0;
		wrapperComponent.paddingTop = 0;
		wrapperComponent.paddingBottom = 0;
		wrapperComponent.fills = [];

		// Add the MySideNav instance to the wrapper and set it to Fill
		if (mySideNavInstance.type === "INSTANCE") {
			mySideNavInstance.layoutAlign = "STRETCH";
		}
		wrapperComponent.appendChild(mySideNavInstance);

		// Position the wrapper component
		wrapperComponent.x = navComponent.x + navComponent.width + spacing;
		wrapperComponent.y = 0;

		// Update selection to include the new wrapper component
		figma.currentPage.selection = [...createdComponentSets, navComponent, wrapperComponent];

		// Update completion message
		figma.notify(`Created ${createdComponentSets.length} navigation components and assembled them into a navigation system! 🎉`);
	} catch (error) {
		console.error('Error creating navigation:', error);
		figma.notify("Error: Could not create navigation. Check console for details.", { error: true });
	}
}

// Debug helper to inspect component properties
async function inspectSelectedComponent() {
	if (figma.currentPage.selection.length === 0) {
		console.log('Please select a component instance');
		return;
	}

	const selected = figma.currentPage.selection[0];
	if (selected.type !== "INSTANCE") {
		console.log('Selected item is not a component instance');
		return;
	}

	// Basic instance properties
	console.log('Instance Properties:', {
		name: selected.name,
		type: selected.type,
		id: selected.id
	});

	// Get variant properties
	console.log('Variant Properties:', {
		variantProperties: selected.variantProperties,
		componentProperties: selected.componentProperties
	});

	// Get text nodes
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

	// Get main component info
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