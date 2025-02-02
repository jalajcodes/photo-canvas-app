import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Alert,
  Dimensions,
  GestureResponderEvent,
  Image,
  Modal,
  PanResponder,
  PanResponderGestureState,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import { stickers } from "@/assets/stickers";
import { ThemedText } from "@/components/ThemedText";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import * as MediaLibrary from "expo-media-library";
import { useRef, useState } from "react";
import Svg, { Path } from "react-native-svg";
import ViewShot from "react-native-view-shot";

const { width } = Dimensions.get("window");

type Point = {
  x: number;
  y: number;
};

type Sticker = {
  id: string;
  uri: string;
  position: Point;
  scale: number;
  rotation: number;
};

type DrawPath = {
  points: Point[];
  color: string;
  width: number;
};

const COLORS = [
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFFF00",
  "#FF00FF",
  "#000000",
  "#FFFFFF",
];
const BRUSH_SIZES = [2, 5, 10, 15];

export default function TabTwoScreen() {
  const { uri } = useLocalSearchParams();

  const [paths, setPaths] = useState<DrawPath[]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [appliedStickers, setAppliedStickers] = useState<Sticker[]>([]);
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [brushColor, setBrushColor] = useState("#FF0000");
  const [brushWidth, setBrushWidth] = useState(5);
  const [showStickerModal, setShowStickerModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  const viewShotRef = useRef<ViewShot>(null);
  const router = useRouter();

  // Pan responder for drawing
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => isDrawingMode,
    onMoveShouldSetPanResponder: () => isDrawingMode,
    onPanResponderGrant: (event: GestureResponderEvent) => {
      const { locationX, locationY } = event.nativeEvent;
      setCurrentPath([{ x: locationX, y: locationY }]);
    },
    onPanResponderMove: (event: GestureResponderEvent) => {
      if (!isDrawingMode) return;
      const { locationX, locationY } = event.nativeEvent;
      setCurrentPath((prev) => [...prev, { x: locationX, y: locationY }]);
    },
    onPanResponderRelease: () => {
      if (currentPath.length > 0) {
        setPaths((prev) => [
          ...prev,
          {
            points: currentPath,
            color: brushColor,
            width: brushWidth,
          },
        ]);
        setCurrentPath([]);
      }
    },
  });

  const addSticker = (stickerUri: string) => {
    const newSticker: Sticker = {
      id: Date.now().toString(),
      uri: stickerUri,
      position: { x: width / 2 - 50, y: 200 }, // Center of screen
      scale: 1,
      rotation: 0,
    };
    setAppliedStickers((prev) => [...prev, newSticker]);
    setSelectedSticker(newSticker.id);
    setShowStickerModal(false);
  };

  const updateStickerPosition = (
    id: string,
    gesture: PanResponderGestureState
  ) => {
    setAppliedStickers((prev) =>
      prev.map((sticker) =>
        sticker.id === id
          ? {
              ...sticker,
              position: {
                x: sticker.position.x + gesture.dx,
                y: sticker.position.y + gesture.dy,
              },
            }
          : sticker
      )
    );
  };

  const savePhoto = async () => {
    if (viewShotRef.current) {
      try {
        const uri = await viewShotRef?.current?.capture?.();

        if (!uri) {
          Alert.alert("Error", "Failed to save photo");
          return;
        }

        await MediaLibrary.saveToLibraryAsync(uri);
        Alert.alert("Success", "Photo saved to gallery!");
      } catch (error) {
        Alert.alert("Error", "Failed to save photo");
      }
    }
  };

  const renderPaths = () => {
    const allPaths = [...paths];
    if (currentPath.length > 0) {
      allPaths.push({
        points: currentPath,
        color: brushColor,
        width: brushWidth,
      });
    }

    return allPaths.map((path, index) => {
      const pathData = path.points
        .map((point, i) => `${i === 0 ? "M" : "L"} ${point.x} ${point.y}`)
        .join(" ");

      return (
        <Path
          key={index}
          d={pathData}
          stroke={path.color}
          strokeWidth={path.width}
          fill="red"
        />
      );
    });
  };

  const undoLastPath = () => {
    setPaths((prev) => prev.slice(0, -1));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ViewShot ref={viewShotRef} style={styles.editorContainer}>
        <Image source={{ uri: uri as string }} style={styles.photo} />
        <Svg style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
          {renderPaths()}
        </Svg>
        {appliedStickers.map((sticker) => {
          const stickerPanResponder = PanResponder.create({
            onStartShouldSetPanResponder: () => !isDrawingMode,
            onMoveShouldSetPanResponder: () => !isDrawingMode,
            onPanResponderGrant: () => {
              setSelectedSticker(sticker.id);
            },
            onPanResponderMove: (_, gesture) => {
              if (!isDrawingMode) {
                updateStickerPosition(sticker.id, gesture);
              }
            },
            onPanResponderRelease: () => {
              setSelectedSticker(null);
            },
          });

          return (
            <View
              key={sticker.id}
              {...stickerPanResponder.panHandlers}
              style={[
                styles.stickerContainer,
                {
                  transform: [
                    { translateX: sticker.position.x },
                    { translateY: sticker.position.y },
                  ],
                },
                selectedSticker === sticker.id && styles.selectedSticker,
              ]}
            >
              <Image
                source={{ uri: sticker.uri }}
                style={[
                  styles.sticker,
                  {
                    transform: [
                      { scale: sticker.scale },
                      { rotate: `${sticker.rotation}deg` },
                    ],
                  },
                ]}
              />
            </View>
          );
        })}
      </ViewShot>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.toolButton, isDrawingMode && styles.activeToolButton]}
          onPress={() => setIsDrawingMode(!isDrawingMode)}
        >
          <MaterialIcons name="edit" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolButton}
          onPress={() => setShowColorModal(true)}
        >
          <MaterialIcons name="color-lens" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolButton}
          onPress={() => setShowStickerModal(true)}
        >
          <MaterialCommunityIcons
            name="sticker-emoji"
            size={24}
            color="white"
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.toolButton} onPress={undoLastPath}>
          <MaterialIcons name="undo" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolButton, { backgroundColor: "#4CAF50" }]}
          onPress={savePhoto}
        >
          <MaterialIcons name="save" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolButton, { backgroundColor: "#f44336" }]}
          onPress={() => {
            setPaths([]);
            setAppliedStickers([]);

            router.push({
              pathname: "/",
            });

            Alert.alert("Cleared", "Image Discarded!");
          }}
        >
          <MaterialIcons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Color Picker Modal */}
      <Modal
        visible={showColorModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowColorModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Select Color</ThemedText>
            <View style={styles.colorContainer}>
              {COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorOption, { backgroundColor: color }]}
                  onPress={() => {
                    setBrushColor(color);
                    setShowColorModal(false);
                  }}
                />
              ))}
            </View>
            <ThemedText style={styles.modalTitle}>Brush Size</ThemedText>
            <View style={styles.brushContainer}>
              {BRUSH_SIZES.map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.brushOption,
                    brushWidth === size && styles.selectedBrush,
                  ]}
                  onPress={() => {
                    setBrushWidth(size);
                    setShowColorModal(false);
                  }}
                >
                  <View
                    style={[
                      styles.brushPreview,
                      { width: size * 2, height: size * 2 },
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Sticker Modal */}
      <Modal
        visible={showStickerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStickerModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Select Sticker</ThemedText>
            <ScrollView horizontal style={styles.stickerContainer}>
              {stickers.map((sticker) => (
                <TouchableOpacity
                  key={sticker.id}
                  style={styles.stickerOption}
                  onPress={() => addSticker(sticker.uri)}
                >
                  <Image
                    source={{ uri: sticker.uri }}
                    style={styles.stickerPreview}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  editorContainer: {
    flex: 1,
  },
  photo: {
    flex: 1,
    resizeMode: "contain",
  },
  sticker: {
    width: 100,
    height: 100,
    // position: "absolute",
    zIndex: 1000,
  },
  selectedSticker: {
    borderWidth: 2,
    borderColor: "#2196F3",
    borderRadius: 5,
  },
  toolbar: {
    position: "absolute",
    bottom: 90,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  toolButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  activeToolButton: {
    backgroundColor: "#2196F3",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  colorContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#000",
  },
  brushContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  brushOption: {
    padding: 10,
    borderRadius: 10,
  },
  selectedBrush: {
    backgroundColor: "#e0e0e0",
  },
  brushPreview: {
    backgroundColor: "#000",
    borderRadius: 50,
  },
  stickerContainer: {
    flexDirection: "row",
    paddingVertical: 10,
  },
  stickerOption: {
    marginRight: 10,
  },
  stickerPreview: {
    width: 80,
    height: 80,
    resizeMode: "contain",
  },
});
