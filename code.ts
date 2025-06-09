// Initialize Figma plugin UI with a 600x800 window size
figma.showUI(__html__);

figma.ui.resize(600,800);

// Define the structure for navigation data. Each parent can have multiple children,
// and both parents and children have unique IDs and display labels
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

// Store component keys for reuse. These keys map to existing components in your Figma library
// that will be used as templates for creating navigation elements
const COMPONENT_KEYS = {
	PARENT_LINK: "13c44fe13f8dde5e2b71e7396b8cec831e61113d",
	CHILD_LINK: "24def9ec4389e2bb91bc2d29298a608e3bf9d7cd",
	SIDENAV_CONTROL: "b8327907713d76a0d44fb8783d93553f81b082fa"
};

// Object that maps node IDs to their SceneNode instances. This gets populated
// as new nodes are created and is used to reference them later for updates
const createdNodes: { [key: string]: SceneNode } = {};

// Define the structure for component variants. Used to specify
// the type of variant and its possible options when creating components
interface VariantProperty {
	type: string;
	variantOptions?: string[];
}

// Fetches a component from Figma's library using its key. Returns null if
// the component doesn't exist or can't be imported. Used to get the base
// components for creating navigation elements
async function getComponent(key: string): Promise<ComponentNode | null> {
	try {
		return await figma.importComponentByKeyAsync(key);
	} catch (error) {
		console.error(`Error importing component with key ${key}:`, error);
		return null;
	}
}

// Listens for messages from the UI and handles different actions.
// Each case in the switch statement corresponds to a different UI action:
// - add/remove parents and children
// - create the full navigation system
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

// Inspects and logs the properties of a component or instance.
// Used for debugging to understand the structure and state of components.
// Handles both standalone components and instances differently:
// - For instances: logs instance-specific properties and variant information
// - For components: logs component definition and variant properties
async function logComponentProperties(component: ComponentNode | InstanceNode) {
	// For instances, log their current state and properties
	if (component.type === "INSTANCE") {
		console.log('Instance Properties:', {
			name: component.name,
			componentProperties: component.componentProperties,
			variantProperties: component.variantProperties
		});
	} 
	// For components, log their definition and variant structure
	else if (component.type === "COMPONENT") {
		const mainComponent = component.parent?.type === "COMPONENT_SET" ? component.parent : component;
		console.log('Component Properties:', {
			name: component.name,
			isVariant: component.parent?.type === "COMPONENT_SET",
			variantProperties: component.parent?.type === "COMPONENT_SET" ? component.parent.componentPropertyDefinitions : component.componentPropertyDefinitions
		});
	}
}

// Main function that builds the entire navigation system.
// Takes the navigation data and creates a hierarchical component structure:
// 1. Creates parent and child components with variants
// 2. Assembles them into a component set
// 3. Creates a final wrapped navigation component ready for use
async function createNavigation(data: NavData) {
	try {
		// Load fonts needed for text elements. Must be done before
		// creating any text nodes to avoid rendering issues
		await figma.loadFontAsync({ family: "Everyday Sans UI", style: "Regular" });
		await figma.loadFontAsync({ family: "Everyday Sans UI", style: "Medium" });

		// Get the base components that will be used as templates.
		// These components must exist in your library for the plugin to work
		const parentLinkComponent = await figma.importComponentByKeyAsync(COMPONENT_KEYS.PARENT_LINK);
		const childLinkComponent = await figma.importComponentByKeyAsync(COMPONENT_KEYS.CHILD_LINK);

		if (!parentLinkComponent || !childLinkComponent) {
			throw new Error('Required components not found in library');
		}

		const spacing = 40;
		let yPosition = 0;
		const createdComponentSets: ComponentSetNode[] = [];

		// Iterate through each parent in the data and create its component structure.
		// For each parent:
		// 1. Create a default state
		// 2. Create a current state if it has children
		// 3. Create states for each active child
		for (const parent of data.parents) {
			const parentFrames: FrameNode[] = [];

			// Create the default state frame for the parent.
			// This is the basic state when nothing is selected
			const parentDefaultFrame = figma.createFrame();
			parentDefaultFrame.name = `Variant=${parent.label}`;
			parentDefaultFrame.layoutMode = "VERTICAL";
			parentDefaultFrame.counterAxisSizingMode = "FIXED";
			parentDefaultFrame.resize(240, parentDefaultFrame.height);
			parentDefaultFrame.itemSpacing = 4;

			// Add the parent instance in its default state
			const parentDefaultInstance = parentLinkComponent.createInstance();
			parentDefaultInstance.layoutAlign = "STRETCH";
			if (parentDefaultInstance.type === "INSTANCE") {
				// Set the label text for the parent
				const textNode = parentDefaultInstance.findOne(node => node.type === "TEXT") as TextNode;
				if (textNode) textNode.characters = parent.label;

				// Configure the parent instance properties
				parentDefaultInstance.setProperties({
					"Variant": "Parent",
					"isCurrent": "False"
				});
			}
			parentDefaultFrame.appendChild(parentDefaultInstance);
			parentFrames.push(parentDefaultFrame);

			// If this parent has children, create additional states:
			// 1. Parent selected with children visible
			// 2. Each child selected state
			if (parent.children && parent.children.length > 0) {
				// Create the frame for when parent is selected
				const parentCurrentFrame = figma.createFrame();
				parentCurrentFrame.name = `Variant=${parent.label} Current`;
				parentCurrentFrame.layoutMode = "VERTICAL";
				parentCurrentFrame.counterAxisSizingMode = "FIXED";
				parentCurrentFrame.resize(240, parentCurrentFrame.height);
				parentCurrentFrame.itemSpacing = 4;

				// Add parent instance in selected state
				const parentCurrentInstance = parentLinkComponent.createInstance();
				parentCurrentInstance.layoutAlign = "STRETCH";
				if (parentCurrentInstance.type === "INSTANCE") {
					// Set the parent's label
					const textNode = parentCurrentInstance.findOne(node => node.type === "TEXT") as TextNode;
					if (textNode) textNode.characters = parent.label;

					// Configure the parent as selected
					parentCurrentInstance.setProperties({
						"Variant": "Parent",
						"isCurrent": "True"
					});
				}
				parentCurrentFrame.appendChild(parentCurrentInstance);

				// Add all child links in their default state
				parent.children.forEach(child => {
					const childInstance = childLinkComponent.createInstance();
					childInstance.layoutAlign = "STRETCH";
					if (childInstance.type === "INSTANCE") {
						// Set the child's label
						const textNode = childInstance.findOne(node => node.type === "TEXT") as TextNode;
						if (textNode) textNode.characters = child.label;

						// Configure the child as not selected
						childInstance.setProperties({
							"Variant": "Child",
							"isCurrent": "False"
						});
					}
					parentCurrentFrame.appendChild(childInstance);
				});

				parentFrames.push(parentCurrentFrame);

				// Create frames for each child being selected
				parent.children.forEach((activeChild, activeChildIndex) => {
					const childFrame = figma.createFrame();
					childFrame.name = `Variant=${activeChild.label}`;
					childFrame.layoutMode = "VERTICAL";
					childFrame.counterAxisSizingMode = "FIXED";
					childFrame.resize(240, childFrame.height);
					childFrame.itemSpacing = 4;

					// Add parent in non-selected state
					const parentInst = parentLinkComponent.createInstance();
					parentInst.layoutAlign = "STRETCH";
					if (parentInst.type === "INSTANCE") {
						// Set parent's label
						const textNode = parentInst.findOne(node => node.type === "TEXT") as TextNode;
						if (textNode) textNode.characters = parent.label;

						// Configure parent as not selected
						parentInst.setProperties({
							"Variant": "Parent",
							"isCurrent": "False"
						});
					}
					childFrame.appendChild(parentInst);

					// Add all children, with the active child selected
					parent.children.forEach((child, index) => {
						const childInstance = childLinkComponent.createInstance();
						childInstance.layoutAlign = "STRETCH";
						if (childInstance.type === "INSTANCE") {
							// Set child's label
							const textNode = childInstance.findOne(node => node.type === "TEXT") as TextNode;
							if (textNode) textNode.characters = child.label;

							// Configure child's selected state based on whether it's the active one
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

			// Arrange all frames horizontally with spacing
			parentFrames.forEach((frame, index) => {
				frame.x = index * (frame.width + spacing);
				frame.y = 0;
			});

			// Convert all frames to components, preserving their properties
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

			// If there are multiple states, combine them into a component set
			// Otherwise, use the single component
			if (components.length > 1) {
				// Create a component set and configure its layout and styling
				const componentSet = figma.combineAsVariants(components, figma.currentPage);
				componentSet.name = `${parent.label} group`;
				componentSet.layoutMode = "HORIZONTAL";
				componentSet.counterAxisSizingMode = "AUTO";
				
				// Add consistent spacing around variants
				componentSet.itemSpacing = 16;
				componentSet.paddingLeft = 16;
				componentSet.paddingRight = 16;
				componentSet.paddingTop = 16;
				componentSet.paddingBottom = 16;

				// Add a purple dashed border to visually group variants
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

			// Stack component sets vertically
			finalNode.y = yPosition;
			yPosition += finalNode.height + spacing;

			createdComponentSets.push(finalNode as ComponentSetNode);
		}

		// Create the main frame that will hold the actual navigation structure.
		// This frame will contain instances of the components we created
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

		// Position the frame to the right of all component sets
		let maxX = 0;
		createdComponentSets.forEach(set => {
			maxX = Math.max(maxX, set.x + set.width);
		});
		instancesFrame.x = maxX + spacing;
		instancesFrame.y = 0;

		// Add the home link at the top of the navigation
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

		// Add the default state of each navigation section
		createdComponentSets.forEach(componentSet => {
			const firstVariant = componentSet.children[0] as ComponentNode;
			const instance = firstVariant.createInstance();
			if (instance.type === "INSTANCE") {
				instance.layoutAlign = "STRETCH";
			}
			instancesFrame.appendChild(instance);
		});

		// Convert the frame into a component for reuse
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

		// Move all instances to the component
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

		// Create the final wrapped component that users will instance
		const mySideNavInstance = navComponent.createInstance();
		const sidenavControlInstance = await figma.importComponentByKeyAsync(COMPONENT_KEYS.SIDENAV_CONTROL);
		
		if (!sidenavControlInstance) {
			throw new Error('Required SIDENAV_CONTROL component not found in library');
		}

		const wrapperComponent = figma.createComponent();
		wrapperComponent.name = "[PX] SideNav-MySideNav";
		wrapperComponent.layoutMode = "VERTICAL";
		wrapperComponent.primaryAxisSizingMode = "FIXED"; // Height: Fixed 800px
		wrapperComponent.counterAxisSizingMode = "AUTO"; // Width: Hug contents
		wrapperComponent.layoutAlign = "STRETCH"; // Ensure children stretch to fill width
		wrapperComponent.primaryAxisAlignItems = "SPACE_BETWEEN"; // Set vertical gap to Auto between objects
		wrapperComponent.paddingLeft = 16;
		wrapperComponent.paddingRight = 16;
		wrapperComponent.paddingTop = 16;
		wrapperComponent.paddingBottom = 16;
		wrapperComponent.fills = [];
		wrapperComponent.resize(wrapperComponent.width, 600); // Set height to 600px

		// Add MySideNav instance and ensure it maintains its width
		if (mySideNavInstance.type === "INSTANCE") {
			mySideNavInstance.layoutAlign = "INHERIT"; // Allow it to maintain its natural width
			mySideNavInstance.resize(240, mySideNavInstance.height); // Ensure 240px width
		}
		wrapperComponent.appendChild(mySideNavInstance);

		// Add SIDENAV_CONTROL instance
		const controlInstance = sidenavControlInstance.createInstance();
		if (controlInstance.type === "INSTANCE") {
			controlInstance.layoutAlign = "STRETCH"; // Make control stretch to match parent width
		}
		wrapperComponent.appendChild(controlInstance);

		// Set the wrapper width to match the MySideNav width plus padding
		const contentWidth = 240; // MySideNav width
		const totalWidth = contentWidth + wrapperComponent.paddingLeft + wrapperComponent.paddingRight;
		wrapperComponent.resize(totalWidth, wrapperComponent.height);

		wrapperComponent.x = navComponent.x + navComponent.width + spacing;
		wrapperComponent.y = 0;

		// Select all created components and notify user
		figma.currentPage.selection = [...createdComponentSets, navComponent, wrapperComponent];
		figma.notify(`Created ${createdComponentSets.length} navigation components and assembled them into a navigation system! 🎉`);
	} catch (error) {
		console.error('Error creating navigation:', error);
		figma.notify("Error: Could not create navigation. Check console for details.", { error: true });
	}
}

// Debug function that provides detailed information about a selected component.
// Logs various aspects of the component:
// - Basic properties (name, type, ID)
// - Variant properties and states
// - Text content
// - Component hierarchy and relationships
async function inspectSelectedComponent() {
	// Verify a component is selected
	if (figma.currentPage.selection.length === 0) {
		console.log('Please select a component instance');
		return;
	}

	const selected = figma.currentPage.selection[0];
	if (selected.type !== "INSTANCE") {
		console.log('Selected item is not a component instance');
		return;
	}

	// Log the basic identifying information
	console.log('Instance Properties:', {
		name: selected.name,
		type: selected.type,
		id: selected.id
	});

	// Log the component's variant and property configurations
	console.log('Variant Properties:', {
		variantProperties: selected.variantProperties,
		componentProperties: selected.componentProperties
	});

	// Log all text content within the component
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

	// Log information about the original component this is an instance of
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
