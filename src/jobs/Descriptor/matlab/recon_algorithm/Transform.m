% MicroStat T Package
% Function Name:  Transform
% Purpose: Transform the grey images to binary images
% Input:    filepath - a path  of the grey *.tif SEM image, it also could
%                              be a matrix with 0-255 grey level, representing the grey image
%              VF -  volume fraction of the composite.
%Output:  iThreshold - the grey threshold used to convert the grey image to
%                                    binary image.
%               BinaryImage - the binary image converted from the grey
%                                        images
%
function [iThreshold, BinaryImage] = Transform(filepath, VF)

if isstr(filepath)
Img = imread(filepath);

else
    Img = 255-filepath;
end

Img = medfilt2(Img);

    

[row col] = size(Img);

TotalNopixel = row*col;

ThresholdPixelNo =  ceil(TotalNopixel*VF);

ranking = sort(Img(:),'descend');

iThreshold = ranking(ThresholdPixelNo);

Image = zeros(row,col);
for i=1:row
    for j=1:col   
            if  Img(i,j)>=iThreshold
                Image(i,j) = 0;
            else
                Image(i,j) = 255;
            end      
    end
end

BinaryImage = uint8(Image);

BinaryImage = double(BinaryImage);
BinaryImage = abs(BinaryImage-255);